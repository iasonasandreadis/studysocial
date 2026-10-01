"use server";
import { revalidatePath } from "next/cache";
import { requireOnboarded } from "@/lib/auth/session";
import { uuidPattern } from "@/lib/posts/validation";
import { commentBody } from "@/lib/feed/validation";
export type InteractionState = {
  error?: string;
  message?: string;
  completedId?: string;
};
function invalidate(id: string) {
  revalidatePath("/feed");
  revalidatePath(`/posts/${id}`);
}
export async function changeKudos(
  _state: InteractionState,
  form: FormData,
): Promise<InteractionState> {
  const { supabase } = await requireOnboarded();
  const id = String(form.get("post_id"));
  const wanted = form.get("wanted");
  if (!uuidPattern.test(id) || !["yes", "no"].includes(String(wanted)))
    return { error: "This post is unavailable." };
  try {
    const { error } = await supabase.rpc("set_post_kudos", {
      target: id,
      wanted: wanted === "yes",
    });
    if (error?.code === "P0001")
      return { error: "Please wait a minute before trying again." };
    if (error)
      return {
        error:
          "Couldn’t update your like. Refresh to check access, then retry.",
      };
  } catch {
    return { error: "Connection interrupted. Retry to save your choice." };
  }
  invalidate(id);
  return { message: wanted === "yes" ? "Post liked." : "Like removed." };
}
export async function addComment(
  _state: InteractionState,
  form: FormData,
): Promise<InteractionState> {
  const { supabase } = await requireOnboarded();
  const id = String(form.get("post_id")),
    commentId = String(form.get("comment_id")),
    body = commentBody(form.get("body")),
    parent = String(form.get("parent_id") ?? "");
  if (
    !uuidPattern.test(id) ||
    !uuidPattern.test(commentId) ||
    !body ||
    (parent && !uuidPattern.test(parent))
  )
    return { error: "Write a comment between 1 and 1,000 characters." };
  try {
    const { error } = parent
      ? await supabase.rpc("reply_to_comment", {
          target: id,
          parent_id: parent,
          comment_id: commentId,
          content: body,
        })
      : await supabase.rpc("add_post_comment", {
          target: id,
          comment_id: commentId,
          content: body,
        });
    if (error?.code === "P0001")
      return { error: "Please wait a minute before trying again." };
    if (error)
      return {
        error:
          "Couldn’t add this comment. Check the post is available; retry with the same text if the connection was interrupted.",
      };
  } catch {
    return {
      error:
        "Connection interrupted. Retry with the same text to avoid a duplicate.",
    };
  }
  invalidate(id);
  return { message: "Comment added.", completedId: commentId };
}
export async function removeComment(
  _state: InteractionState,
  form: FormData,
): Promise<InteractionState> {
  const { supabase, user } = await requireOnboarded();
  const id = String(form.get("post_id")),
    commentId = String(form.get("comment_id"));
  if (!uuidPattern.test(id) || !uuidPattern.test(commentId))
    return { error: "Comment unavailable." };
  try {
    const { error } = await supabase
      .from("comments")
      .delete()
      .eq("id", commentId)
      .eq("post_id", id)
      .eq("author_id", user.id);
    if (error) return { error: "Couldn’t delete this comment. Please retry." };
  } catch {
    return { error: "Connection interrupted. Retry deletion." };
  }
  invalidate(id);
  return { message: "Your comment has been removed." };
}

export async function readCommentThread(
  postId: string,
  parentId: string,
  page: number,
) {
  const { supabase } = await requireOnboarded();
  if (
    !uuidPattern.test(postId) ||
    !uuidPattern.test(parentId) ||
    !Number.isInteger(page) ||
    page < 0 ||
    page > 10000
  )
    return { error: "Comment unavailable." };
  const { data, error } = await supabase.rpc("comment_thread", {
    target: postId,
    parent_id: parentId,
    page_number: page,
  });
  if (error || !data) return { error: "This thread is no longer available." };
  return {
    thread: data as {
      parent: import("@/lib/feed/types").PostComment;
      replies: import("@/lib/feed/types").PostComment[];
    },
  };
}
