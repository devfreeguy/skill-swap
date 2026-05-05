import Image from "next/image";
import Link from "next/link";

const Logo = () => {
  return (
    <Link href="/" className="flex items-center">
      <div className="relative size-7 m-2">
        <Image src="/images/logo.webp" alt="SkillSwap" fill />
      </div>
      <h1 className="text-lg font-bold text-foreground">SkillSwap</h1>
    </Link>
  );
};

export default Logo;
