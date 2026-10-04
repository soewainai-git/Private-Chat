export type UserIdentity = 'Soe' | 'Haru';

export interface ChatMessage {
  id: string;
  name: UserIdentity;
  message: string;
  viewonce_photo?: string | null;
  viewonce_opened?: boolean;
  reply_name?: string | null;
  reply_message?: string | null;
  created_at: string;
}

export interface PresenceLog {
  identity: UserIdentity;
  last_seen: string;
  is_online?: boolean;
}

export type AppVersion = 'soe_haru' | 'ananda_peafowl';
