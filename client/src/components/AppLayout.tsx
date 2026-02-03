import { useAuth } from "@/hooks/useAuth";
import { useThemeStore } from "@/store";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  House,
  Moon,
  Sun,
  SignOut,
  Swatches,
  User,
  List,
  GithubLogo,
  TwitterLogo,
  LinkedinLogo,
} from "@phosphor-icons/react";
import { Link, useLocation } from "wouter";
import { useState } from "react";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";

const navItems = [
  { label: "Home", path: "/", icon: House },
  { label: "Showcase", path: "/showcase", icon: Swatches },
];

function NavLinks({ onClick, mobile = false }: { onClick?: () => void; mobile?: boolean }) {
  const [location] = useLocation();

  return (
    <>
      {navItems.map((item) => {
        const isActive = location === item.path;
        return (
          <Link 
            key={item.path} 
            href={item.path} 
            onClick={onClick}
            className={`flex items-center gap-2 rounded-lg text-sm font-medium transition-colors active:scale-[0.98] ${
              mobile 
                ? "px-4 py-3 min-h-[48px] gap-3" 
                : "px-3 py-2 h-9"
            } ${
              isActive
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:text-foreground hover:bg-accent"
            }`}
          >
            <item.icon className={mobile ? "h-5 w-5" : "h-4 w-4"} />
            {item.label}
          </Link>
        );
      })}
    </>
  );
}

function ThemeToggle() {
  const { theme, toggleTheme, switchable } = useThemeStore();

  if (!switchable) return null;

  return (
    <Button variant="ghost" size="icon" onClick={toggleTheme}>
      {theme === "light" ? (
        <Moon className="h-5 w-5" />
      ) : (
        <Sun className="h-5 w-5" />
      )}
    </Button>
  );
}

function UserMenu() {
  const { user, logout, loading } = useAuth();

  if (loading) {
    return <div className="h-8 w-8 rounded-full bg-muted animate-pulse" />;
  }

  if (!user) {
    return (
      <Button asChild size="sm">
        <Link href="/login">Sign in</Link>
      </Button>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="relative h-8 w-8 rounded-full">
          <Avatar className="h-8 w-8">
            <AvatarFallback className="text-xs">
              {user.name?.charAt(0).toUpperCase() || user.email?.charAt(0).toUpperCase() || "U"}
            </AvatarFallback>
          </Avatar>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <div className="flex items-center gap-2 p-2">
          <Avatar className="h-8 w-8">
            <AvatarFallback className="text-xs">
              {user.name?.charAt(0).toUpperCase() || "U"}
            </AvatarFallback>
          </Avatar>
          <div className="flex flex-col space-y-0.5">
            <p className="text-sm font-medium">{user.name || "User"}</p>
            <p className="text-xs text-muted-foreground truncate">
              {user.email}
            </p>
          </div>
        </div>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild className="cursor-pointer">
          <Link href="/" className="flex items-center">
            <User className="mr-2 h-4 w-4" />
            Profile
          </Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={logout}
          className="cursor-pointer text-destructive focus:text-destructive"
        >
          <SignOut className="mr-2 h-4 w-4" />
          Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function MobileNav() {
  const [open, setOpen] = useState(false);
  const { user, logout } = useAuth();

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="md:hidden h-10 w-10">
          <List className="h-5 w-5" />
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-[280px] p-0">
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="p-4 border-b flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-primary flex items-center justify-center">
              <span className="text-primary-foreground font-bold">A</span>
            </div>
            <span className="font-semibold text-lg">App</span>
          </div>
          
          {/* Navigation */}
          <nav className="flex-1 flex flex-col gap-1 p-3">
            <NavLinks onClick={() => setOpen(false)} mobile />
          </nav>
          
          {/* User section */}
          {user && (
            <div className="border-t p-3">
              <div className="flex items-center gap-3 px-4 py-3 rounded-lg bg-muted/50">
                <Avatar className="h-10 w-10">
                  <AvatarFallback>
                    {user.name?.charAt(0).toUpperCase() || "U"}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{user.name || "User"}</p>
                  <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                </div>
              </div>
              <Button
                variant="ghost"
                className="w-full mt-2 justify-start text-destructive hover:text-destructive hover:bg-destructive/10 h-12"
                onClick={() => {
                  logout();
                  setOpen(false);
                }}
              >
                <SignOut className="mr-3 h-5 w-5" />
                Sign out
              </Button>
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}

export function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-14 sm:h-16 items-center">
          {/* Mobile menu */}
          <MobileNav />

          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 mr-4 sm:mr-6">
            <div className="h-8 w-8 sm:h-9 sm:w-9 rounded-lg bg-primary flex items-center justify-center">
              <span className="text-primary-foreground font-bold text-sm">A</span>
            </div>
            <span className="font-semibold hidden sm:inline-block">App</span>
          </Link>

          {/* Desktop navigation */}
          <nav className="hidden md:flex items-center gap-1 h-full">
            <NavLinks />
          </nav>

          {/* Right side */}
          <div className="flex items-center gap-1 sm:gap-2 ml-auto">
            <ThemeToggle />
            <UserMenu />
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="flex-1">{children}</main>

      {/* Footer */}
      <Footer />
    </div>
  );
}

const footerLinks = {
  product: [
    { label: "Features", href: "#" },
    { label: "Pricing", href: "#" },
    { label: "Changelog", href: "#" },
    { label: "Documentation", href: "#" },
  ],
  company: [
    { label: "About", href: "#" },
    { label: "Blog", href: "#" },
    { label: "Careers", href: "#" },
    { label: "Contact", href: "#" },
  ],
  legal: [
    { label: "Privacy", href: "#" },
    { label: "Terms", href: "#" },
    { label: "Cookie Policy", href: "#" },
  ],
};

const socialLinks = [
  { icon: GithubLogo, href: "https://github.com", label: "GitHub" },
  { icon: TwitterLogo, href: "https://twitter.com", label: "Twitter" },
  { icon: LinkedinLogo, href: "https://linkedin.com", label: "LinkedIn" },
];

function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="border-t bg-muted/30">
      <div className="container py-12 md:py-16">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 lg:gap-12">
          {/* Brand */}
          <div className="col-span-2 md:col-span-1">
            <Link href="/" className="flex items-center gap-2 mb-4">
              <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center">
                <span className="text-primary-foreground font-bold text-sm">A</span>
              </div>
              <span className="font-semibold">App</span>
            </Link>
            <p className="text-sm text-muted-foreground mb-4 max-w-xs">
              A modern fullstack template for building production-ready web applications.
            </p>
            <div className="flex gap-3">
              {socialLinks.map((social) => (
                <a
                  key={social.label}
                  href={social.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="h-9 w-9 flex items-center justify-center rounded-lg bg-muted hover:bg-muted/80 text-muted-foreground hover:text-foreground transition-colors"
                  aria-label={social.label}
                >
                  <social.icon className="h-4 w-4" />
                </a>
              ))}
            </div>
          </div>

          {/* Product */}
          <div>
            <h3 className="font-semibold mb-3 text-sm">Product</h3>
            <ul className="space-y-2">
              {footerLinks.product.map((link) => (
                <li key={link.label}>
                  <a
                    href={link.href}
                    className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Company */}
          <div>
            <h3 className="font-semibold mb-3 text-sm">Company</h3>
            <ul className="space-y-2">
              {footerLinks.company.map((link) => (
                <li key={link.label}>
                  <a
                    href={link.href}
                    className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Legal */}
          <div>
            <h3 className="font-semibold mb-3 text-sm">Legal</h3>
            <ul className="space-y-2">
              {footerLinks.legal.map((link) => (
                <li key={link.label}>
                  <a
                    href={link.href}
                    className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="mt-12 pt-8 border-t flex flex-col sm:flex-row justify-between items-center gap-4">
          <p className="text-sm text-muted-foreground">
            © {currentYear} App. All rights reserved.
          </p>
          <div className="flex items-center gap-1 text-sm text-muted-foreground">
            <span>Built with</span>
            <span className="text-foreground font-medium">React</span>
            <span>•</span>
            <span className="text-foreground font-medium">tRPC</span>
            <span>•</span>
            <span className="text-foreground font-medium">Supabase</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
