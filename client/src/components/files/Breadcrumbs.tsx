import { Link } from "wouter";

export interface BreadcrumbsProps {
  accountId?: number;
  bucket: string;
  prefix: string;
  onNavigate?: () => void;
}

export function Breadcrumbs({ accountId, bucket, prefix, onNavigate }: BreadcrumbsProps) {
  // Split the prefix into path segments
  const segments = prefix.split("/").filter(Boolean);
  
  // Helper function to build URL using path parameters
  const createUrl = (prefixPath = "") => {
    if (!accountId) {
      return '/';
    }
    
    let url = `/browser/${accountId}/${bucket}`;
    if (prefixPath) {
      // Remove trailing slash for URL (but keep it for the actual prefix)
      url += `/${prefixPath.replace(/\/$/, '')}`;
    }
    return url;
  };
  
  // Define item type
  type BreadcrumbItem = {
    label: string;
    path: string;
    isCurrent?: boolean;
  };
  
  // Build the breadcrumb items
  const items: BreadcrumbItem[] = [
    { label: "Home", path: "/" },
    { label: bucket, path: createUrl() },
  ];
  
  // Add path segments to the breadcrumbs
  let currentPath = "";
  for (let i = 0; i < segments.length; i++) {
    currentPath += segments[i] + "/";
    items.push({
      label: segments[i],
      path: createUrl(currentPath),
      isCurrent: i === segments.length - 1,
    });
  }
  
  return (
    <div className="mb-4 flex items-center flex-wrap text-sm">
      {items.map((item, index) => (
        <div key={index} className="flex items-center">
          {index > 0 && (
            <i className="ri-arrow-right-s-line mx-1 text-muted-foreground"></i>
          )}
          
          {item.isCurrent ? (
            <span className="text-foreground">{item.label}</span>
          ) : (
            <Link href={item.path}>
              <a className="text-muted-foreground hover:text-primary">{item.label}</a>
            </Link>
          )}
        </div>
      ))}
    </div>
  );
}
