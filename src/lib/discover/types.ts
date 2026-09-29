export type Student = {
  id: string;
  handle: string;
  display_name: string | null;
  is_private?: boolean;
};
export type CommunityInfo = {
  id: string;
  name: string;
  description: string | null;
  kind: string | null;
  visibility: string;
  can_view: boolean;
  own: boolean;
  member: boolean;
  pending: boolean;
};
export type PostingCommunity = { id: string; name: string };
