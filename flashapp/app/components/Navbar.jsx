import { Calendar, Home, Inbox, Search, Settings } from "lucide-react"
import Link from "next/link"
import {
    NavigationMenu,
    NavigationMenuContent,
    NavigationMenuItem,
    NavigationMenuLink,
    NavigationMenuList,
    NavigationMenuTrigger,
    navigationMenuTriggerStyle,
} from "@/components/ui/navigation-menu"
import { cn } from "@/lib/utils"

const items = [
    {
        title: "Home",
        url: "/",
        icon: Home,
        description: "Generate flashcards from your content"
    },
    {
        title: "Notes",
        url: "/notes",
        icon: Inbox,
        description: "Create and manage your study notes"
    },
    {
        title: "Quiz",
        url: "/quiz",
        icon: Search,
        description: "Take interactive quizzes"
    },
    {
        title: "History",
        url: "/history",
        icon: Calendar,
        description: "View your learning history"
    },
    {
        title: "Settings",
        url: "#",
        icon: Settings,
        description: "Manage your preferences"
    },
]

export default function AppNavbar() {
    return (
        <NavigationMenu>
            <NavigationMenuList className="space-x-1">
                {items.map((item) => (
                    <NavigationMenuItem key={item.title}>
                        <Link href={item.url} legacyBehavior passHref>
                            <NavigationMenuLink
                                className={cn(
                                    navigationMenuTriggerStyle(),
                                    "bg-transparent text-gray-400 hover:bg-gray-800/80 hover:text-gray-100 focus:bg-gray-800/80 focus:text-gray-100 data-[active]:bg-gray-800 data-[active]:text-gray-100 transition-all duration-200 border-0 h-10 px-4 text-sm font-medium"
                                )}
                            >
                                <item.icon className="mr-2 h-4 w-4" />
                                {item.title}
                            </NavigationMenuLink>
                        </Link>
                    </NavigationMenuItem>
                ))}
            </NavigationMenuList>
        </NavigationMenu>
    )
}