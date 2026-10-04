import { getSupabase, getCommentsTableName, getPresenceTableName } from './supabaseClient';
import { ChatMessage, UserIdentity } from '../types/chat';

const STORAGE_KEY_MESSAGES = 'soe_haru_v2_messages_isolated';
const STORAGE_KEY_LAST_SEEN_SOE = 'soe_haru_v2_last_seen_soe';
const STORAGE_KEY_LAST_SEEN_HARU = 'soe_haru_v2_last_seen_haru';

// Unique Tab ID to prevent re-processing self broadcasts
const TAB_ID = typeof window !== 'undefined' ? 'tab-' + Math.random().toString(36).substring(2, 9) : 'tab-srv';

// Cross-tab broadcast channel for instant local synchronization
const broadcast = typeof window !== 'undefined' && 'BroadcastChannel' in window 
  ? new BroadcastChannel('soe_haru_realtime_isolated_channel') 
  : null;

export function getLocalMessages(): ChatMessage[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_MESSAGES);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

export function saveLocalMessages(messages: ChatMessage[]) {
  try {
    localStorage.setItem(STORAGE_KEY_MESSAGES, JSON.stringify(messages));
  } catch (err) {
    console.error('Failed to save to localStorage:', err);
  }
}

export async function fetchMessages(): Promise<ChatMessage[]> {
  const local = getLocalMessages();
  const supabase = getSupabase();
  if (!supabase) {
    return local;
  }

  const tableName = getCommentsTableName();

  try {
    const { data, error } = await supabase
      .from(tableName)
      .select('*')
      .order('created_at', { ascending: false })
      .limit(60);

    if (error || !data) {
      return local;
    }

    const remoteMessages: ChatMessage[] = data
      .filter((row: any) => row.name === 'Soe' || row.name === 'Haru')
      .map((row: any) => ({
        id: String(row.id),
        name: row.name as UserIdentity,
        message: row.message || '',
        viewonce_photo: row.viewonce_photo || null,
        viewonce_opened: Boolean(row.viewonce_opened),
        reply_name: row.reply_name || null,
        reply_message: row.reply_message || null,
        created_at: row.created_at || new Date().toISOString(),
      }))
      .reverse();

    if (remoteMessages.length > 0) {
      const map = new Map<string, ChatMessage>();
      local.forEach(m => map.set(m.id, m));
      remoteMessages.forEach(m => {
        for (const [key, val] of map.entries()) {
          if (
            val.name === m.name &&
            val.message === m.message &&
            Math.abs(new Date(val.created_at).getTime() - new Date(m.created_at).getTime()) < 6000
          ) {
            map.delete(key);
          }
        }
        map.set(m.id, m);
      });

      const merged = Array.from(map.values()).sort(
        (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      );
      saveLocalMessages(merged);
      return merged;
    }
    return local;
  } catch (err) {
    console.warn('fetchMessages fallback to local:', err);
    return local;
  }
}

export async function sendMessage(
  sender: UserIdentity,
  message: string,
  replyTo?: { name: string; message: string } | null
): Promise<ChatMessage> {
  const tempId = 'temp-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6);
  const newMsg: ChatMessage = {
    id: tempId,
    name: sender,
    message: message.trim(),
    reply_name: replyTo?.name || null,
    reply_message: replyTo?.message || null,
    created_at: new Date().toISOString(),
  };

  // 1. Save locally
  const current = getLocalMessages();
  const updated = [...current, newMsg];
  saveLocalMessages(updated);

  // 2. Broadcast to other tabs only
  if (broadcast) {
    broadcast.postMessage({ type: 'NEW_MESSAGE', payload: newMsg, tabId: TAB_ID });
  }

  // 3. Sync to Supabase
  const supabase = getSupabase();
  if (supabase) {
    try {
      const tableName = getCommentsTableName();
      const { data, error } = await supabase
        .from(tableName)
        .insert({
          name: sender,
          message: message.trim(),
          reply_name: replyTo?.name ?? null,
          reply_message: replyTo?.message ?? null,
          created_at: newMsg.created_at,
        })
        .select()
        .single();

      if (!error && data?.id) {
        newMsg.id = String(data.id);
        const latest = getLocalMessages().map(m => (m.id === tempId ? newMsg : m));
        saveLocalMessages(latest);
      }
    } catch (err) {
      console.warn('Supabase insert skipped, stored locally:', err);
    }
  }

  return newMsg;
}

function base64ToBlob(base64Data: string): Blob {
  try {
    const parts = base64Data.split(',');
    const mime = parts[0]?.match(/:(.*?);/)?.[1] || 'image/jpeg';
    const bstr = atob(parts[1] || parts[0]);
    let n = bstr.length;
    const u8arr = new Uint8Array(n);
    while (n--) {
      u8arr[n] = bstr.charCodeAt(n);
    }
    return new Blob([u8arr], { type: mime });
  } catch (err) {
    console.error('Failed to parse base64 to blob:', err);
    return new Blob([], { type: 'image/jpeg' });
  }
}

export async function sendViewOncePhoto(
  sender: UserIdentity,
  base64Data: string,
  replyTo?: { name: string; message: string } | null
): Promise<ChatMessage> {
  const tempId = 'vo-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6);
  let finalPhotoUrl = base64Data;
  const fileName = `soe_haru/photo_${Date.now()}_${Math.random().toString(36).substring(2, 7)}.jpg`;

  // Attempt to upload to Supabase Storage bucket 'photos'
  const supabase = getSupabase();
  if (supabase) {
    try {
      const blob = base64ToBlob(base64Data);
      const { data: uploadData, error: uploadErr } = await supabase.storage
        .from('photos')
        .upload(fileName, blob, {
          contentType: 'image/jpeg',
          upsert: true,
        });

      if (!uploadErr && uploadData?.path) {
        const { data: publicUrlData } = supabase.storage
          .from('photos')
          .getPublicUrl(uploadData.path);
        if (publicUrlData?.publicUrl) {
          finalPhotoUrl = publicUrlData.publicUrl;
        }
      } else {
        console.warn('Supabase storage upload note:', uploadErr?.message);
      }
    } catch (err) {
      console.warn('Storage upload fallback to direct data:', err);
    }
  }

  const newMsg: ChatMessage = {
    id: tempId,
    name: sender,
    message: '',
    viewonce_photo: finalPhotoUrl,
    viewonce_opened: false,
    reply_name: replyTo?.name || null,
    reply_message: replyTo?.message || null,
    created_at: new Date().toISOString(),
  };

  // 1. Save locally
  const current = getLocalMessages();
  const updated = [...current, newMsg];
  saveLocalMessages(updated);

  // 2. Broadcast
  if (broadcast) {
    broadcast.postMessage({ type: 'NEW_MESSAGE', payload: newMsg, tabId: TAB_ID });
  }

  // 3. Supabase insert into comments table
  if (supabase) {
    try {
      const tableName = getCommentsTableName();
      const { data, error } = await supabase
        .from(tableName)
        .insert({
          name: sender,
          message: '',
          viewonce_photo: finalPhotoUrl,
          viewonce_opened: false,
          reply_name: replyTo?.name ?? null,
          reply_message: replyTo?.message ?? null,
          created_at: newMsg.created_at,
        })
        .select()
        .single();

      if (!error && data?.id) {
        newMsg.id = String(data.id);
        const latest = getLocalMessages().map(m => (m.id === tempId ? newMsg : m));
        saveLocalMessages(latest);
      }
    } catch (err) {
      console.warn('Supabase photo record insert skipped:', err);
    }
  }

  return newMsg;
}

export async function markViewOnceOpened(msgId: string): Promise<void> {
  const current = getLocalMessages();
  const targetMsg = current.find(m => m.id === msgId);
  const targetPhotoUrl = targetMsg?.viewonce_photo || null;

  const updated = current.map(m => {
    if (m.id === msgId) {
      return { ...m, viewonce_opened: true };
    }
    return m;
  });
  saveLocalMessages(updated);

  if (broadcast) {
    broadcast.postMessage({ type: 'MARK_OPENED', payload: { id: msgId }, tabId: TAB_ID });
  }

  const supabase = getSupabase();
  if (supabase) {
    try {
      const tableName = getCommentsTableName();
      await supabase
        .from(tableName)
        .update({ viewonce_opened: true })
        .eq('id', msgId);

      // Update status to opened in comments table.
      // Photo file in Supabase Storage is preserved for backup as requested.
    } catch (err) {
      console.warn('Supabase mark opened or storage purge error:', err);
    }
  }
}

export async function sendHeartbeat(identity: UserIdentity): Promise<void> {
  const now = new Date().toISOString();
  if (identity === 'Soe') {
    localStorage.setItem(STORAGE_KEY_LAST_SEEN_SOE, now);
  } else {
    localStorage.setItem(STORAGE_KEY_LAST_SEEN_HARU, now);
  }

  if (broadcast) {
    broadcast.postMessage({
      type: 'HEARTBEAT',
      payload: { identity, timestamp: now },
      tabId: TAB_ID
    });
  }

  const supabase = getSupabase();
  if (supabase) {
    try {
      const presenceTable = getPresenceTableName();
      await supabase
        .from(presenceTable)
        .upsert({ identity, last_seen: now });
    } catch {}
  }
}

export async function fetchLastSeen(partnerIdentity: UserIdentity): Promise<string | null> {
  const supabase = getSupabase();
  if (supabase) {
    try {
      const presenceTable = getPresenceTableName();
      const { data } = await supabase
        .from(presenceTable)
        .select('last_seen')
        .eq('identity', partnerIdentity)
        .maybeSingle();

      if (data?.last_seen) {
        return data.last_seen;
      }
    } catch {}
  }

  const key = partnerIdentity === 'Soe' ? STORAGE_KEY_LAST_SEEN_SOE : STORAGE_KEY_LAST_SEEN_HARU;
  return localStorage.getItem(key) || null;
}

export function subscribeToChatEvents(
  onNewMessage: (msg: ChatMessage) => void,
  onPhotoOpened: (msgId: string) => void,
  onTyping: (payload: { sender: UserIdentity; isTyping: boolean }) => void,
  onPresenceUpdate: (identity: UserIdentity, timestamp: string) => void
) {
  const handleBroadcast = (e: MessageEvent) => {
    const { type, payload, tabId } = e.data || {};
    if (tabId === TAB_ID) return;

    if (type === 'NEW_MESSAGE' && payload) {
      onNewMessage(payload);
    } else if (type === 'MARK_OPENED' && payload?.id) {
      onPhotoOpened(payload.id);
    } else if (type === 'TYPING' && payload) {
      onTyping(payload);
    } else if (type === 'HEARTBEAT' && payload) {
      onPresenceUpdate(payload.identity, payload.timestamp);
    }
  };

  if (broadcast) {
    broadcast.addEventListener('message', handleBroadcast);
  }

  const supabase = getSupabase();
  let channel: any = null;

  if (supabase) {
    const tableName = getCommentsTableName();
    channel = supabase.channel(`soe-haru-isolated-${tableName}`);

    channel
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: tableName }, (payload: any) => {
        const row = payload.new as any;
        if (row.name === 'Soe' || row.name === 'Haru') {
          const msg: ChatMessage = {
            id: String(row.id),
            name: row.name,
            message: row.message || '',
            viewonce_photo: row.viewonce_photo || null,
            viewonce_opened: Boolean(row.viewonce_opened),
            reply_name: row.reply_name || null,
            reply_message: row.reply_message || null,
            created_at: row.created_at || new Date().toISOString(),
          };
          onNewMessage(msg);
        }
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: tableName }, (payload: any) => {
        const row = payload.new as any;
        if (row.viewonce_opened) {
          onPhotoOpened(String(row.id));
        }
      })
      .on('broadcast', { event: 'typing' }, ({ payload }: any) => {
        if (payload && (payload.name === 'Soe' || payload.name === 'Haru')) {
          onTyping({ sender: payload.name, isTyping: !payload.stopped });
        }
      })
      .subscribe();
  }

  return () => {
    if (broadcast) {
      broadcast.removeEventListener('message', handleBroadcast);
    }
    if (supabase && channel) {
      supabase.removeChannel(channel);
    }
  };
}

export function broadcastTyping(sender: UserIdentity, isTyping: boolean) {
  if (broadcast) {
    broadcast.postMessage({
      type: 'TYPING',
      payload: { sender, isTyping },
      tabId: TAB_ID
    });
  }

  const supabase = getSupabase();
  if (supabase) {
    try {
      const tableName = getCommentsTableName();
      const channel = supabase.channel(`soe-haru-isolated-${tableName}`);
      channel.send({
        type: 'broadcast',
        event: 'typing',
        payload: { name: sender, stopped: !isTyping },
      });
    } catch {}
  }
}
