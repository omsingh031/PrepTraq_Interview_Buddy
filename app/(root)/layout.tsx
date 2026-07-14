import { ReactNode } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { isAuthenticated } from "@/lib/actions/auth.action";
import { redirect } from "next/navigation";
import LogoutButton from "@/components/LogoutButton";

const RootLayout = async({ children }: { children: ReactNode }) => {
    const isUserAuthenticated = await isAuthenticated();
    if (!isUserAuthenticated) redirect('/sign-in');

    return (
        <div className="root-layout">
            <nav className="p-4 flex items-center justify-between border-b">
                <Link href="/" className="flex items-center gap-2">
                    <Image src="/logo.svg" alt="logo" width={38} height={32} />
                    <h2 className="text-primary-100 text-xl font-semibold">PrepTraq</h2>
                </Link>
                <LogoutButton />
            </nav>

            <main className="p-6 flex justify-center">
                <div className="w-full max-w-3xl">
                    {children}
                </div>
            </main>
        </div>
    );
};

export default RootLayout;