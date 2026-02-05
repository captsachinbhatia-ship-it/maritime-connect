 import * as React from "react";
 import { Input } from "@/components/ui/input";
 import { cn } from "@/lib/utils";
 
 interface PhoneInputProps extends Omit<React.ComponentProps<"input">, "onChange"> {
   value: string;
   onChange: (value: string) => void;
 }
 
 // Only allow digits, spaces, +, -, and parentheses
 const PHONE_REGEX = /^[\d\s+\-()]*$/;
 
 const PhoneInput = React.forwardRef<HTMLInputElement, PhoneInputProps>(
   ({ className, value, onChange, ...props }, ref) => {
     const [error, setError] = React.useState(false);
 
     const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
       const newValue = e.target.value;
       
       if (newValue === '' || PHONE_REGEX.test(newValue)) {
         setError(false);
         onChange(newValue);
       } else {
         setError(true);
       }
     };
 
     return (
       <div className="space-y-1">
         <Input
           ref={ref}
           type="tel"
           inputMode="tel"
           value={value}
           onChange={handleChange}
           className={cn(error && "border-destructive", className)}
           {...props}
         />
         {error && (
           <p className="text-xs text-destructive">Only numbers and phone symbols allowed.</p>
         )}
       </div>
     );
   }
 );
 
 PhoneInput.displayName = "PhoneInput";
 
 export { PhoneInput };