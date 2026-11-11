export default function Empty({
  icon,
  title,
  desc,
  children,
}: {
  icon: string;
  title: string;
  desc?: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="empty-box">
      <div className="ico" aria-hidden="true">{icon}</div>
      <h3>{title}</h3>
      {desc && <p>{desc}</p>}
      {children && <div className="empty-actions">{children}</div>}
    </div>
  );
}
