@@ .. @@
 interface BrandFormProps {
   onBack: () => void;
   onSuccess: () => void;
+  editingBrand?: any;
 }

-export function BrandForm({ onBack, onSuccess }: BrandFormProps) {
+export function BrandForm({ onBack, onSuccess, editingBrand }: BrandFormProps) {
   const [formData, setFormData] = useState({
     name: '',
     slug: '',