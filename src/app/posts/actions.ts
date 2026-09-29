"use server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createHash } from "node:crypto";
import { requireOnboarded } from "@/lib/auth/session";
import { preparePostImage } from "@/lib/posts/image";
import {
  validatePost,
  uuidPattern,
  MAX_POST_IMAGE_BYTES,
} from "@/lib/posts/validation";
export type PostActionState = { error?: string; draftId?: string };
export async function publishPost(
  _state: PostActionState,
  form: FormData,
): Promise<PostActionState> {
  const { supabase } = await requireOnboarded();
  const { payload, error } = validatePost(form);
  if (error || !payload) return { error };
  const id = String(form.get("post_id")),
    file = form.get("image");
  if (!(file instanceof File) || !file.size || file.size > MAX_POST_IMAGE_BYTES)
    return { error: "Choose a still JPEG, PNG or WebP image up to 3 MB." };
  let prepared;
  try {
    prepared = await preparePostImage(new Uint8Array(await file.arrayBuffer()));
  } catch {
    return {
      error:
        "That image could not be processed. Choose a still JPEG, PNG or WebP image up to 3 MB (40 megapixels maximum).",
    };
  }
  try {
    const { data, error: prepareError } = await supabase.rpc(
      "prepare_photo_post",
      { draft_id: id, payload, image_hash: prepared.hash },
    );
    if (prepareError)
      return {
        error:
          prepareError.code === "23505"
            ? "That session is already linked to a post. Choose another session or none."
            : "We couldn’t prepare this post. Retry with the same photo, or open your saved draft to discard it.",
        draftId: id,
      };
    if (data.state !== "published") {
      const path = String(data.path);
      const { error: uploadError } = await supabase.storage
        .from("post-images")
        .upload(path, prepared.bytes, {
          contentType: "image/webp",
          cacheControl: "0",
          upsert: false,
        });
      if (uploadError) {
        // A retry may encounter an upload that succeeded before its response was lost.
        // Verify the bytes before reusing it; never publish a different photo silently.
        const { data: existing, error: readError } = await supabase.storage
          .from("post-images")
          .download(path);
        if (
          readError ||
          !existing ||
          createHash("sha256")
            .update(new Uint8Array(await existing.arrayBuffer()))
            .digest("hex") !== prepared.hash
        )
          return {
            error:
              "Upload did not complete. Your post is still private. Retry with the same photo or discard the draft.",
            draftId: id,
          };
      }
      const { error: publishError } = await supabase.rpc("publish_photo_post", {
        target: id,
      });
      if (publishError)
        return {
          error:
            "Your photo was uploaded, but publishing did not complete. Retry with the same photo; it will not create a duplicate.",
          draftId: id,
        };
    }
  } catch {
    return {
      error:
        "The connection was interrupted. Retry with the same photo, or check your saved post before trying again.",
      draftId: id,
    };
  }
  revalidatePath("/posts");
  revalidatePath("/feed");
  revalidatePath("/communities", "layout");
  revalidatePath("/discover");
  revalidatePath("/sessions", "layout");
  redirect(`/posts/${id}`);
}
export async function deletePost(
  _state: PostActionState,
  form: FormData,
): Promise<PostActionState> {
  const { supabase } = await requireOnboarded();
  const id = String(form.get("post_id"));
  if (!uuidPattern.test(id) || form.get("confirm") !== "on")
    return { error: "Confirm that you want to delete this post and photo." };
  try {
    const { data: path, error } = await supabase.rpc("begin_post_deletion", {
      target: id,
    });
    if (error)
      return { error: "This post is unavailable or could not be deleted." };
    if (path) {
      const { error: storageError } = await supabase.storage
        .from("post-images")
        .remove([path]);
      if (storageError)
        return {
          error:
            "The post is hidden from others, but its photo could not be removed. Retry deletion to finish cleanup.",
        };
    }
    const { error: finishError } = await supabase.rpc("finish_post_deletion", {
      target: id,
    });
    if (finishError)
      return {
        error: "The post is hidden. Please retry deletion to finish cleanup.",
      };
  } catch {
    return {
      error:
        "Deletion was interrupted. Retry to finish removing the post and its photo.",
    };
  }
  revalidatePath("/posts");
  revalidatePath("/feed");
  revalidatePath("/communities", "layout");
  revalidatePath("/discover");
  revalidatePath("/sessions", "layout");
  redirect("/posts");
}
