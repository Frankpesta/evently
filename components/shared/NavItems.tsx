"use client";
import { headerLinks } from "@/constants";
import Link from "next/link";
import { usePathname } from "next/navigation";

const NavItems = () => {
	const pathname = usePathname();
	return (
		<ul className="md:flex-between flex w-full flex-col items-start gap-5 md:flex-row font-bold">
			{headerLinks.map((link) => {
				const isActive = pathname === link.route;

				return (
					<li
						key={link.route}
						className={`${
							isActive && "text-primary-500"
						} text-center p-medium-16 whitespace-nowrap font-bold`}>
						<Link href={link.route}>{link.label}</Link>
					</li>
				);
			})}
		</ul>
	);
};

export default NavItems;
