import { Icon } from "@/components/ui/icon";
import { durationLabel } from "@/lib/posts/types";
export function StudyHighlight({
  seconds,
  subject,
}: {
  seconds: number;
  subject?: string | null;
}) {
  return (
    <div className="study-highlight">
      <Icon name="clock" />
      <div>
        <span>Study session{subject ? ` · ${subject}` : ""}</span>
        <strong>{durationLabel(seconds)}</strong>
      </div>
    </div>
  );
}
