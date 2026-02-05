import { useAuth } from '@/contexts/AuthContext';
 import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
 import { Eye } from 'lucide-react';
 
 export function PreviewBanner() {
  const { isPreviewMode, previewRole, setPreviewRole, crmUser } = useAuth();
 
   if (!isPreviewMode) return null;
 
   return (
     <div className="fixed top-0 left-0 right-0 z-50 bg-amber-500 text-amber-950 px-4 py-1.5 flex items-center justify-between text-sm font-medium">
       <div className="flex items-center gap-2">
         <Eye className="h-4 w-4" />
         <span>Preview Mode</span>
         <span className="text-amber-800">— DB writes disabled</span>
       </div>
       
       <div className="flex items-center gap-3">
         <span className="text-amber-800 text-xs">
          Viewing as: {crmUser?.full_name}
         </span>
         <div className="flex items-center gap-2">
           <label className="text-xs font-medium">Preview Role:</label>
           <Select value={previewRole} onValueChange={(value) => setPreviewRole(value as 'Admin' | 'User')}>
             <SelectTrigger className="h-7 w-24 bg-amber-400 border-amber-600 text-amber-950 text-xs">
               <SelectValue />
             </SelectTrigger>
             <SelectContent className="bg-amber-100 border-amber-300">
               <SelectItem value="Admin" className="text-amber-950">Admin</SelectItem>
               <SelectItem value="User" className="text-amber-950">User</SelectItem>
             </SelectContent>
           </Select>
         </div>
       </div>
     </div>
   );
 }