import "@/components/screens/funnel.css";

export default function FunnelLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="stage">
      <div className="phone">{children}</div>
    </div>
  );
}
