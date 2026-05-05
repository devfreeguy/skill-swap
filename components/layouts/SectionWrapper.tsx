import { cn } from "@/lib/utils";

interface SectionWrapperProps {
  children: React.ReactNode;
  className?: string;
  id?: string;
}

export default function SectionWrapper({
  children,
  className,
  id,
}: SectionWrapperProps) {
  return (
    <section id={id} className={cn("w-full", className)}>
      <div className="max-w-6xl mx-auto px-4 md:px-8 lg:px-12 py-16 md:py-24 h-full flex flex-col">
        {children}
      </div>
    </section>
  );
}
