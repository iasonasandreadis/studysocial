import Link from "next/link";
import Image from "next/image";
import { createClient } from "@/lib/supabase/server";
import { Icon } from "@/components/ui/icon";
export async function PhotoGrid({
  authorId,
  own,
  page,
  handle,
}: {
  authorId: string;
  own: boolean;
  page: number;
  handle: string;
}) {
  const supabase = await createClient();
  // The signed-in client's RLS applies to both the post query and signed media URLs.
  const { data, error } = await supabase
    .from("posts")
    .select("id,caption,post_media(object_path,alt_text)")
    .eq("author_id", authorId)
    .eq("publication_state", "published")
    .order("created_at", { ascending: false })
    .order("id")
    .range(page * 24, page * 24 + 24);
  if (error) throw new Error("Couldn’t load these photos.");
  const posts = await Promise.all(
    (data ?? []).slice(0, 24).map(async (post) => {
      const media = Array.isArray(post.post_media)
        ? post.post_media[0]
        : post.post_media;
      const result = media
        ? await supabase.storage
            .from("post-images")
            .createSignedUrl(media.object_path, 60)
        : null;
      return {
        id: post.id,
        alt: media?.alt_text || post.caption?.slice(0, 100) || "Photo post",
        url: result?.data?.signedUrl,
      };
    }),
  );
  return (
    <section className="profile-photos" aria-label="Photo posts">
      <h2 className="section-title">Posts</h2>
      {posts.length ? (
        <div className="photo-grid">
          {posts.map((post) => (
            <Link
              href={`/posts/${post.id}`}
              key={post.id}
              aria-label={`Open post: ${post.alt}`}
            >
              {post.url ? (
                <Image
                  src={post.url}
                  alt={post.alt}
                  width={400}
                  height={400}
                  unoptimized
                />
              ) : (
                <span>Open photo</span>
              )}
            </Link>
          ))}
        </div>
      ) : (
        <div className="simple-empty">
          <Icon name="camera" />
          <h2>{page ? "No more posts" : "No posts yet"}</h2>
          {own && (
            <Link className="button" href="/posts/new">
              Share a photo
            </Link>
          )}
        </div>
      )}
      <nav className="pagination" aria-label="Photo pages">
        {page > 0 && (
          <Link href={`/u/${handle}?page=${page - 1}`}>Previous</Link>
        )}
        {data && data.length > 24 && (
          <Link href={`/u/${handle}?page=${page + 1}`}>More photos</Link>
        )}
      </nav>
    </section>
  );
}
