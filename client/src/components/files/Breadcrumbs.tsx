import { Link } from "wouter";

interface BreadcrumbsProps {
  accountId: number;
  bucket: string;
  prefix: string;
}

export function Breadcrumbs({ accountId, bucket, prefix }: BreadcrumbsProps) {
  // Split the prefix into path segments
  const segments = prefix.split("/").filter(Boolean);
  
  // Build the breadcrumb items
  const items = [
    { label: "Home", path: "/" },
    { label: bucket, path: `/browser/${accountId}/${bucket}` },
  ];
  
  // Add path segments to the breadcrumbs
  let currentPath = "";
  for (let i = 0; i < segments.length; i++) {
    currentPath += segments[i] + "/";
    items.push({
      label: segments[i],
      path: `/browser/${accountId}/${bucket}/${currentPath}`,
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
