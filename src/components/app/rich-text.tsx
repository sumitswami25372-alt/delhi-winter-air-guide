import { Fragment, type ReactNode } from "react";

/** Render a small, safe subset of Markdown (bold, headings, bullet and numbered lists) without HTML injection. */
function inline(text: string): ReactNode[] {
  return text
    .split(/(\*\*[^*]+\*\*)/g)
    .map((part, i) =>
      part.startsWith("**") && part.endsWith("**") && part.length > 4 ? (
        <strong key={i}>{part.slice(2, -2)}</strong>
      ) : (
        <Fragment key={i}>{part}</Fragment>
      ),
    );
}

export function RichText({ text }: { text: string }) {
  const blocks: ReactNode[] = [];
  let list: { ordered: boolean; items: string[] } | null = null;
  const flush = () => {
    if (!list) return;
    const Tag = list.ordered ? "ol" : "ul";
    blocks.push(
      <Tag
        key={`l${blocks.length}`}
        className={list.ordered ? "list-decimal space-y-1 pl-5" : "list-disc space-y-1 pl-5"}
      >
        {list.items.map((it, i) => (
          <li key={i}>{inline(it)}</li>
        ))}
      </Tag>,
    );
    list = null;
  };
  for (const raw of text.split("\n")) {
    const line = raw.trimEnd();
    const bullet = /^\s*[-*•]\s+(.*)$/.exec(line);
    const numbered = /^\s*\d+[.)]\s+(.*)$/.exec(line);
    const heading = /^#{1,4}\s+(.*)$/.exec(line);
    if (bullet?.[1] !== undefined) {
      if (!list || list.ordered) {
        flush();
        list = { ordered: false, items: [] };
      }
      list.items.push(bullet[1]);
    } else if (numbered?.[1] !== undefined) {
      if (!list || !list.ordered) {
        flush();
        list = { ordered: true, items: [] };
      }
      list.items.push(numbered[1]);
    } else {
      flush();
      if (heading?.[1] !== undefined) {
        blocks.push(
          <p key={`h${blocks.length}`} className="font-semibold">
            {inline(heading[1])}
          </p>,
        );
      } else if (line.trim()) {
        blocks.push(<p key={`p${blocks.length}`}>{inline(line)}</p>);
      }
    }
  }
  flush();
  return <div className="space-y-2">{blocks}</div>;
}
