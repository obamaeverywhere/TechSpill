export function Highlight({
  text,
  term,
}: {
  text: string;
  term?: string | null;
}) {
  if (!term?.trim()) return <>{text}</>;
  const needle = term.trim().toLocaleLowerCase();
  const parts = [];
  let start = 0,
    index = text.toLocaleLowerCase().indexOf(needle);
  while (index !== -1) {
    parts.push(
      text.slice(start, index),
      <mark key={index}>{text.slice(index, index + needle.length)}</mark>,
    );
    start = index + needle.length;
    index = text.toLocaleLowerCase().indexOf(needle, start);
  }
  parts.push(text.slice(start));
  return <>{parts}</>;
}
