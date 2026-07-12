export type WorkspaceRole = "owner" | "admin" | "member";
export type PlanKey = "free" | "starter" | "pro";
export type SubscriptionProvider = "mock" | "stripe";
export type SubscriptionStatus =
  | "active"
  | "trialing"
  | "past_due"
  | "canceled"
  | "incomplete";

export type Profile = {
  id: string;
  email: string;
  full_name: string | null;
  created_at: string;
  updated_at: string;
};

export type Workspace = {
  id: string;
  owner_id: string;
  name: string;
  website: string | null;
  industry: string | null;
  created_at: string;
  updated_at: string;
};

export type WorkspaceMember = {
  workspace_id: string;
  user_id: string;
  role: WorkspaceRole;
  created_at: string;
};

export type Subscription = {
  id: string;
  workspace_id: string;
  provider: SubscriptionProvider;
  provider_customer_id: string | null;
  provider_subscription_id: string | null;
  plan_key: PlanKey;
  scheduled_plan_key: PlanKey | null;
  status: SubscriptionStatus;
  billing_email: string | null;
  current_period_start: string;
  current_period_end: string | null;
  cancel_at_period_end: boolean;
  created_at: string;
  updated_at: string;
};

export type ChatbotStatus = "draft" | "active" | "disabled";
export type ChatbotTheme = "light" | "dark";
export type ChatbotPosition = "bottom-right" | "bottom-left";

export type Chatbot = {
  id: string;
  workspace_id: string;
  public_id: string;
  name: string;
  description: string | null;
  welcome_message: string;
  system_prompt: string;
  status: ChatbotStatus;
  primary_color: string;
  theme: ChatbotTheme;
  position: ChatbotPosition;
  branding_enabled: boolean;
  created_at: string;
  updated_at: string;
};

export type DocumentStatus = "processing" | "ready" | "failed";

export type KnowledgeDocument = {
  id: string;
  workspace_id: string;
  chatbot_id: string;
  filename: string;
  original_filename: string;
  storage_path: string;
  mime_type: string;
  size_bytes: number;
  status: DocumentStatus;
  chunks_count: number;
  error_message: string | null;
  created_at: string;
  processed_at: string | null;
  updated_at: string;
};

export type DocumentChunk = {
  id: string;
  workspace_id: string;
  chatbot_id: string;
  document_id: string;
  chunk_index: number;
  content: string;
  token_count: number;
  metadata: Record<string, unknown>;
  created_at: string;
};

export type ConversationSource = "playground" | "widget";
export type MessageRole = "user" | "assistant" | "system";

export type Conversation = {
  id: string;
  workspace_id: string;
  chatbot_id: string;
  source: ConversationSource;
  public_session_id: string | null;
  created_at: string;
  last_message_at: string;
};

export type Message = {
  id: string;
  conversation_id: string;
  role: MessageRole;
  content: string;
  input_tokens: number | null;
  output_tokens: number | null;
  is_answered: boolean;
  created_at: string;
};

export type MessageSource = {
  id: string;
  message_id: string;
  document_chunk_id: string;
  similarity_score: number;
  created_at: string;
};
