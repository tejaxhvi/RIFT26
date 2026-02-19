import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, XCircle } from "lucide-react";

// The exact data structure coming from your backend
export type FixRecord = {
  id: number;
  file: string;
  type: string;
  line: number;
  commit: string;
  status: string;
};

interface FixesTableProps {
  fixes: FixRecord[];
}

export function FixesTable({ fixes }: FixesTableProps) {
  // Helper function to color-code the bug types
  const getBugTypeColor = (type: string) => {
    switch (type) {
      case "SYNTAX": return "bg-red-500/10 text-red-500 hover:bg-red-500/20 border-red-500/20";
      case "TYPE_ERROR": return "bg-blue-500/10 text-blue-500 hover:bg-blue-500/20 border-blue-500/20";
      case "LINTING": return "bg-yellow-500/10 text-yellow-500 hover:bg-yellow-500/20 border-yellow-500/20";
      case "LOGIC": return "bg-purple-500/10 text-purple-500 hover:bg-purple-500/20 border-purple-500/20";
      case "IMPORT": return "bg-orange-500/10 text-orange-500 hover:bg-orange-500/20 border-orange-500/20";
      case "INDENTATION": return "bg-gray-500/10 text-gray-500 hover:bg-gray-500/20 border-gray-500/20";
      default: return "bg-secondary text-secondary-foreground";
    }
  };

  if (!fixes || fixes.length === 0) {
    return (
      <div className="flex h-40 items-center justify-center text-sm text-muted-foreground border rounded-md border-dashed">
        No fixes applied yet. Run the agent to see results.
      </div>
    );
  }

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[250px]">File</TableHead>
            <TableHead>Bug Type</TableHead>
            <TableHead className="text-center">Line</TableHead>
            <TableHead>Commit Message</TableHead>
            <TableHead className="text-right">Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {fixes.map((fix) => (
            <TableRow key={fix.id}>
              <TableCell className="font-mono text-xs">{fix.file}</TableCell>
              <TableCell>
                <Badge variant="outline" className={getBugTypeColor(fix.type)}>
                  {fix.type}
                </Badge>
              </TableCell>
              <TableCell className="text-center font-mono text-xs text-muted-foreground">
                {fix.line}
              </TableCell>
              <TableCell className="text-sm truncate max-w-[300px]" title={fix.commit}>
                {fix.commit}
              </TableCell>
              <TableCell className="text-right">
                <div className="flex items-center justify-end gap-2">
                  {fix.status.toLowerCase() === "fixed" ? (
                    <span className="flex items-center text-green-500 text-sm font-medium">
                      <CheckCircle2 className="mr-1 h-4 w-4" />
                      Fixed
                    </span>
                  ) : (
                    <span className="flex items-center text-red-500 text-sm font-medium">
                      <XCircle className="mr-1 h-4 w-4" />
                      Failed
                    </span>
                  )}
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}