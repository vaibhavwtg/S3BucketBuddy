import React from "react";
import { Link } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { 
  ArrowRight, 
  Shield, 
  Cloud, 
  Zap, 
  RefreshCw, 
  Share2, 
  Users,
  BarChart
} from "lucide-react";

export default function LandingPage() {
  const { isAuthenticated } = useAuth();

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-secondary/10">
      {/* Navigation */}
      <header className="container mx-auto px-4 py-6">
        <nav className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Cloud className="h-8 w-8 text-primary" />
            <span className="text-2xl font-bold">S3 Manager</span>
          </div>
          <div className="hidden md:flex items-center space-x-8">
            <Link href="/">
              <a className="text-foreground/80 hover:text-foreground transition-colors">Home</a>
            </Link>
            <Link href="/about">
              <a className="text-foreground/80 hover:text-foreground transition-colors">About</a>
            </Link>
            <Link href="/contact">
              <a className="text-foreground/80 hover:text-foreground transition-colors">Contact</a>
            </Link>
            {isAuthenticated ? (
              <Link href="/dashboard">
                <Button>
                  Dashboard <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
            ) : (
              <Link href="/auth">
                <Button>
                  Login / Register <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
            )}
          </div>
          <div className="md:hidden">
            <Button variant="ghost" size="icon">
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="feather feather-menu"><line x1="3" y1="12" x2="21" y2="12"></line><line x1="3" y1="6" x2="21" y2="6"></line><line x1="3" y1="18" x2="21" y2="18"></line></svg>
            </Button>
          </div>
        </nav>
      </header>

      {/* Hero section */}
      <section className="container mx-auto px-4 py-16 md:py-24">
        <div className="grid grid-cols-1 md:grid-cols-2 items-center gap-12">
          <div>
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight mb-6">
              Manage your <span className="bg-gradient-to-r from-primary to-purple-500 bg-clip-text text-transparent">Amazon S3</span> storage with ease
            </h1>
            <p className="text-lg md:text-xl text-muted-foreground mb-8">
              A comprehensive web-based tool for managing multiple S3 accounts, sharing files securely, and performing batch operations efficiently.
            </p>
            <div className="flex flex-col sm:flex-row gap-4">
              {isAuthenticated ? (
                <Link href="/dashboard">
                  <Button size="lg" className="px-8">
                    Go to Dashboard <ArrowRight className="ml-2 h-5 w-5" />
                  </Button>
                </Link>
              ) : (
                <Link href="/auth">
                  <Button size="lg" className="px-8">
                    Get Started <ArrowRight className="ml-2 h-5 w-5" />
                  </Button>
                </Link>
              )}
              <Link href="/about">
                <Button size="lg" variant="outline">
                  Learn More
                </Button>
              </Link>
            </div>
          </div>
          <div className="relative hidden md:block">
            <div className="absolute -inset-0.5 bg-gradient-to-r from-primary to-purple-500 rounded-lg blur opacity-20"></div>
            <div className="relative bg-card rounded-lg shadow-xl p-6 border">
              <div className="space-y-4">
                <div className="h-8 w-full bg-secondary/60 rounded-md"></div>
                <div className="grid grid-cols-3 gap-4">
                  <div className="h-24 w-full bg-secondary/40 rounded-md"></div>
                  <div className="h-24 w-full bg-secondary/40 rounded-md"></div>
                  <div className="h-24 w-full bg-secondary/40 rounded-md"></div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="h-32 w-full bg-secondary/30 rounded-md"></div>
                  <div className="h-32 w-full bg-secondary/30 rounded-md"></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features section */}
      <section className="bg-card py-16 md:py-24">
        <div className="container mx-auto px-4">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Powerful Features
            </h2>
            <p className="text-muted-foreground text-lg">
              Everything you need to manage your Amazon S3 storage efficiently in one place
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            <div className="bg-background p-6 rounded-lg border shadow-sm">
              <div className="h-12 w-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4">
                <Cloud className="h-6 w-6 text-primary" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Multi-Account Management</h3>
              <p className="text-muted-foreground">
                Manage multiple S3 accounts from different AWS regions in a single interface.
              </p>
            </div>
            
            <div className="bg-background p-6 rounded-lg border shadow-sm">
              <div className="h-12 w-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4">
                <Zap className="h-6 w-6 text-primary" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Batch Operations</h3>
              <p className="text-muted-foreground">
                Perform bulk uploads, downloads, copies, and deletions across buckets and folders.
              </p>
            </div>
            
            <div className="bg-background p-6 rounded-lg border shadow-sm">
              <div className="h-12 w-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4">
                <Share2 className="h-6 w-6 text-primary" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Secure File Sharing</h3>
              <p className="text-muted-foreground">
                Share files with configurable expiry dates, password protection, and access tracking.
              </p>
            </div>
            
            <div className="bg-background p-6 rounded-lg border shadow-sm">
              <div className="h-12 w-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4">
                <BarChart className="h-6 w-6 text-primary" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Storage Analytics</h3>
              <p className="text-muted-foreground">
                Monitor storage usage, file distribution, and access patterns with visual analytics.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA section */}
      <section className="container mx-auto px-4 py-16 md:py-24">
        <div className="bg-gradient-to-r from-primary/20 to-purple-500/20 rounded-2xl p-8 md:p-12">
          <div className="max-w-3xl mx-auto text-center">
            <h2 className="text-3xl md:text-4xl font-bold mb-6">
              Ready to simplify your S3 management?
            </h2>
            <p className="text-xl mb-8">
              Join thousands of users who've streamlined their cloud storage workflows.
            </p>
            {isAuthenticated ? (
              <Link href="/dashboard">
                <Button size="lg" className="px-8">
                  Go to Dashboard <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </Link>
            ) : (
              <Link href="/auth">
                <Button size="lg" className="px-8">
                  Get Started Now <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </Link>
            )}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-muted py-12">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div>
              <div className="flex items-center space-x-2 mb-4">
                <Cloud className="h-6 w-6 text-primary" />
                <span className="text-xl font-bold">S3 Manager</span>
              </div>
              <p className="text-muted-foreground mb-4">
                A comprehensive web-based Amazon S3 client for efficient file management.
              </p>
            </div>
            
            <div>
              <h3 className="font-semibold mb-4">Product</h3>
              <ul className="space-y-2">
                <li><Link href="/features"><a className="text-muted-foreground hover:text-foreground transition-colors">Features</a></Link></li>
                <li><Link href="/pricing"><a className="text-muted-foreground hover:text-foreground transition-colors">Pricing</a></Link></li>
                <li><Link href="/documentation"><a className="text-muted-foreground hover:text-foreground transition-colors">Documentation</a></Link></li>
              </ul>
            </div>
            
            <div>
              <h3 className="font-semibold mb-4">Company</h3>
              <ul className="space-y-2">
                <li><Link href="/about"><a className="text-muted-foreground hover:text-foreground transition-colors">About Us</a></Link></li>
                <li><Link href="/contact"><a className="text-muted-foreground hover:text-foreground transition-colors">Contact</a></Link></li>
                <li><Link href="/careers"><a className="text-muted-foreground hover:text-foreground transition-colors">Careers</a></Link></li>
              </ul>
            </div>
            
            <div>
              <h3 className="font-semibold mb-4">Legal</h3>
              <ul className="space-y-2">
                <li><Link href="/privacy"><a className="text-muted-foreground hover:text-foreground transition-colors">Privacy Policy</a></Link></li>
                <li><Link href="/terms"><a className="text-muted-foreground hover:text-foreground transition-colors">Terms of Service</a></Link></li>
                <li><Link href="/security"><a className="text-muted-foreground hover:text-foreground transition-colors">Security</a></Link></li>
              </ul>
            </div>
          </div>
          
          <div className="border-t border-border mt-12 pt-8 text-center text-muted-foreground">
            <p>&copy; {new Date().getFullYear()} S3 Manager. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}