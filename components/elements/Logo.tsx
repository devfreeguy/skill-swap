import { cn } from "@/lib/utils";
import Image from "next/image";
import Link from "next/link";

const Logo = ({ className }: { className?: string }) => {
  return (
    <Link href="/" className={cn("flex items-center", className)}>
      <div className="relative size-5 m-2">
        <Image src="/images/logo.webp" alt="SkillSwap" fill />
      </div>
      <h1 className="text-md font-bold text-foreground">SkillSwap</h1>
    </Link>
  );
};

export default Logo;
