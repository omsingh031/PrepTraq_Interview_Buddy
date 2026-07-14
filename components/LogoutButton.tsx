"use client";

import { signOut } from "@/lib/actions/auth.action";
import { useRouter } from "next/navigation";

const LogoutButton = () => {
    const router = useRouter();

    const handleLogout = async () => {
        await signOut();
        router.push("/sign-in");
    };

    return (
        <button
            onClick={handleLogout}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-white bg-red-500 hover:bg-red-600 transition-colors"
        >
            Logout
        </button>
    );
};

export default LogoutButton;