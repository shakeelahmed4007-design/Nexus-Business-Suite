import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  PackagePlus,
  Tag,
  DollarSign,
  Boxes,
  FileText,
  Upload,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Percent,
  Layers,
  Trash2,
} from 'lucide-react';
import { createProductApi } from '@/modules/Sales/salesApiService';
import { productCategories } from '@/modules/Sales/products';

interface AddProductModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

const PRESET_EMOJIS = ['🎧', '⌚', '🔊', '🔌', '💻', '🖱️', '⌨️', '🔋', '📱', '📷', '💡', '📓', '📦', '👕', '👟', '🕶️'];

export function AddProductModal({ isOpen, onClose, onSuccess }: AddProductModalProps) {
  // Form state
  const [name, setName] = useState('');
  const [sku, setSku] = useState('');
  const [category, setCategory] = useState('Electronics');
  const [price, setPrice] = useState<string>('');
  const [costPrice, setCostPrice] = useState<string>('');
  const [stock, setStock] = useState<string>('50');
  const [taxPercentage, setTaxPercentage] = useState<string>('18');
  const [description, setDescription] = useState('');
  const [selectedEmoji, setSelectedEmoji] = useState('📦');

  // Image upload state
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // UI state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Auto-generate SKU
  const generateSku = () => {
    const randomCode = Math.floor(1000 + Math.random() * 9000);
    const prefix = name ? name.substring(0, 2).toUpperCase() : 'PRD';
    return `${prefix}-${randomCode}`;
  };

  useEffect(() => {
    if (isOpen) {
      setName('');
      setSku(generateSku());
      setCategory('Electronics');
      setPrice('');
      setCostPrice('');
      setStock('50');
      setTaxPercentage('18');
      setDescription('');
      setSelectedEmoji('📦');
      setImagePreview(null);
      setErrorMsg(null);
      setSuccessMsg(null);
    }
  }, [isOpen]);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      setErrorMsg('Image size must be less than 5MB.');
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      if (reader.result) {
        setImagePreview(reader.result as string);
        setErrorMsg(null);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveImage = () => {
    setImagePreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    if (!name.trim()) {
      setErrorMsg('Please enter a Product Name.');
      return;
    }

    const parsedPrice = parseFloat(price);
    if (isNaN(parsedPrice) || parsedPrice < 0) {
      setErrorMsg('Please enter a valid Selling Price.');
      return;
    }

    const parsedStock = parseInt(stock, 10);
    if (isNaN(parsedStock) || parsedStock < 0) {
      setErrorMsg('Please enter a valid Stock Quantity.');
      return;
    }

    const finalSku = sku.trim() || generateSku();
    const finalCostPrice = costPrice ? parseFloat(costPrice) : Math.round(parsedPrice * 0.7);
    const finalTax = taxPercentage ? parseFloat(taxPercentage) : 18;
    const finalImageUrl = imagePreview || selectedEmoji || '📦';

    setIsSubmitting(true);

    try {
      const res = await createProductApi({
        sku: finalSku,
        name: name.trim(),
        category,
        price: parsedPrice,
        costPrice: finalCostPrice,
        stock: parsedStock,
        taxPercentage: finalTax,
        description: description.trim(),
        imageUrl: finalImageUrl,
      });

      if (res.success) {
        setSuccessMsg(`Product "${name}" added successfully to catalog!`);
        setIsSubmitting(false);
        if (onSuccess) onSuccess();
        setTimeout(() => {
          onClose();
        }, 1200);
      } else {
        setErrorMsg(res.error || 'Failed to add product.');
        setIsSubmitting(false);
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'An unexpected error occurred.');
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-ink-950/60 backdrop-blur-sm"
        />

        {/* Modal Dialog */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          transition={{ duration: 0.2 }}
          className="relative w-full max-w-2xl overflow-hidden rounded-2xl border border-ink-200 bg-white shadow-2xl dark:border-ink-800 dark:bg-ink-900"
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-ink-100 bg-ink-50/50 px-6 py-4 dark:border-ink-800 dark:bg-ink-950/50">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-500/10 text-brand-600 dark:bg-brand-500/20 dark:text-brand-400">
                <PackagePlus className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-base font-bold text-ink-900 dark:text-ink-50">
                  Add New Product
                </h2>
                <p className="text-xs text-ink-500 dark:text-ink-400">
                  Super Admin Console — Add a new product with image upload & stock management
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="rounded-lg p-1.5 text-ink-400 hover:bg-ink-100 dark:hover:bg-ink-800 cursor-pointer"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Form Body */}
          <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[78vh] overflow-y-auto scrollbar-thin">
            {errorMsg && (
              <div className="flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs font-medium text-rose-700 dark:border-rose-900/40 dark:bg-rose-950/40 dark:text-rose-300">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            {successMsg && (
              <div className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-xs font-medium text-emerald-700 dark:border-emerald-900/40 dark:bg-emerald-950/40 dark:text-emerald-300">
                <CheckCircle2 className="h-4 w-4 shrink-0" />
                <span>{successMsg}</span>
              </div>
            )}

            {/* Product Image Upload Section */}
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-ink-700 dark:text-ink-200">
                Product Image *
              </label>
              <div className="flex flex-col sm:flex-row items-center gap-4 rounded-xl border border-dashed border-ink-300 bg-ink-50/50 p-4 dark:border-ink-700 dark:bg-ink-950/50">
                {/* Image Preview Box */}
                <div className="relative flex h-24 w-24 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-ink-200 bg-white dark:border-ink-700 dark:bg-ink-900 shadow-sm">
                  {imagePreview ? (
                    <>
                      <img src={imagePreview} alt="Product Preview" className="h-full w-full object-cover" />
                      <button
                        type="button"
                        onClick={handleRemoveImage}
                        className="absolute right-1 top-1 rounded-full bg-rose-600 p-1 text-white shadow hover:bg-rose-700 transition"
                        title="Remove Image"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </>
                  ) : (
                    <div className="text-center">
                      <span className="text-3xl">{selectedEmoji}</span>
                      <p className="mt-1 text-[10px] text-ink-400">Default Emoji</p>
                    </div>
                  )}
                </div>

                {/* Upload Action */}
                <div className="flex-1 text-center sm:text-left space-y-2">
                  <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleImageChange}
                      className="hidden"
                      id="product-image-file"
                    />
                    <label
                      htmlFor="product-image-file"
                      className="inline-flex items-center gap-1.5 rounded-xl bg-brand-600 px-3.5 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-brand-500 cursor-pointer transition-all"
                    >
                      <Upload className="h-3.5 w-3.5" />
                      <span>{imagePreview ? 'Change Image' : 'Upload Image'}</span>
                    </label>

                    {imagePreview && (
                      <button
                        type="button"
                        onClick={handleRemoveImage}
                        className="inline-flex items-center gap-1 rounded-xl border border-rose-200 bg-rose-50 px-2.5 py-1.5 text-xs font-medium text-rose-600 hover:bg-rose-100 dark:border-rose-900/40 dark:bg-rose-950/30 dark:text-rose-300 cursor-pointer"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        <span>Use Emoji Instead</span>
                      </button>
                    )}
                  </div>

                  <p className="text-[11px] text-ink-400">
                    Upload PNG, JPG, or WEBP up to 5MB. Displays directly on POS & Inventory screens.
                  </p>

                  {/* Fallback Preset Emoji Picker */}
                  {!imagePreview && (
                    <div className="pt-1">
                      <p className="mb-1 text-[11px] font-semibold text-ink-600 dark:text-ink-400">Or pick an icon emoji:</p>
                      <div className="flex flex-wrap gap-1 justify-center sm:justify-start">
                        {PRESET_EMOJIS.map((emoji) => (
                          <button
                            key={emoji}
                            type="button"
                            onClick={() => setSelectedEmoji(emoji)}
                            className={`flex h-7 w-7 items-center justify-center rounded-lg text-sm transition-transform hover:scale-110 cursor-pointer ${
                              selectedEmoji === emoji ? 'bg-brand-100 ring-2 ring-brand-500 dark:bg-brand-900/40' : 'bg-ink-100 dark:bg-ink-800'
                            }`}
                          >
                            {emoji}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Product Name & SKU */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-xs font-semibold text-ink-700 dark:text-ink-200">
                  Product Name *
                </label>
                <div className="relative">
                  <Tag className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" />
                  <input
                    type="text"
                    required
                    placeholder="e.g. Wireless Gaming Mouse"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="h-10 w-full rounded-xl border border-ink-200 bg-ink-50 pl-10 pr-4 text-xs text-ink-900 focus:border-brand-500 focus:bg-white focus:outline-none dark:border-ink-700 dark:bg-ink-950 dark:text-ink-100"
                  />
                </div>
              </div>

              <div>
                <div className="mb-1 flex items-center justify-between">
                  <label className="text-xs font-semibold text-ink-700 dark:text-ink-200">
                    SKU / Product Code *
                  </label>
                  <button
                    type="button"
                    onClick={() => setSku(generateSku())}
                    className="flex items-center gap-1 text-[11px] font-bold text-brand-600 hover:underline dark:text-brand-400 cursor-pointer"
                  >
                    <RefreshCw className="h-3 w-3" /> Regenerate
                  </button>
                </div>
                <div className="relative">
                  <Layers className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" />
                  <input
                    type="text"
                    required
                    placeholder="e.g. WM-006"
                    value={sku}
                    onChange={(e) => setSku(e.target.value)}
                    className="h-10 w-full rounded-xl border border-ink-200 bg-ink-50 pl-10 pr-4 text-xs text-ink-900 focus:border-brand-500 focus:bg-white focus:outline-none dark:border-ink-700 dark:bg-ink-950 dark:text-ink-100 font-mono"
                  />
                </div>
              </div>
            </div>

            {/* Category & Stock */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-xs font-semibold text-ink-700 dark:text-ink-200">
                  Category *
                </label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="h-10 w-full rounded-xl border border-ink-200 bg-ink-50 px-3 text-xs font-semibold text-ink-900 focus:border-brand-500 focus:bg-white focus:outline-none dark:border-ink-700 dark:bg-ink-950 dark:text-ink-100 cursor-pointer"
                >
                  {productCategories.filter((c) => c !== 'All').map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                  <option value="General">General</option>
                  <option value="Clothing">Clothing</option>
                  <option value="Audio">Audio</option>
                  <option value="Wearables">Wearables</option>
                </select>
              </div>

              <div>
                <label className="mb-1 block text-xs font-semibold text-ink-700 dark:text-ink-200">
                  Initial Stock Quantity *
                </label>
                <div className="relative">
                  <Boxes className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" />
                  <input
                    type="number"
                    min="0"
                    required
                    placeholder="e.g. 50"
                    value={stock}
                    onChange={(e) => setStock(e.target.value)}
                    className="h-10 w-full rounded-xl border border-ink-200 bg-ink-50 pl-10 pr-4 text-xs text-ink-900 focus:border-brand-500 focus:bg-white focus:outline-none dark:border-ink-700 dark:bg-ink-950 dark:text-ink-100 font-semibold"
                  />
                </div>
              </div>
            </div>

            {/* Selling Price & Cost Price */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div className="sm:col-span-1">
                <label className="mb-1 block text-xs font-semibold text-ink-700 dark:text-ink-200">
                  Selling Price (PKR) *
                </label>
                <div className="relative">
                  <DollarSign className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" />
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    required
                    placeholder="4500"
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                    className="h-10 w-full rounded-xl border border-ink-200 bg-ink-50 pl-10 pr-4 text-xs text-ink-900 focus:border-brand-500 focus:bg-white focus:outline-none dark:border-ink-700 dark:bg-ink-950 dark:text-ink-100 font-bold"
                  />
                </div>
              </div>

              <div className="sm:col-span-1">
                <label className="mb-1 block text-xs font-semibold text-ink-700 dark:text-ink-200">
                  Cost Price (PKR)
                </label>
                <div className="relative">
                  <DollarSign className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" />
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder={price ? `${Math.round(parseFloat(price) * 0.7)}` : '3150'}
                    value={costPrice}
                    onChange={(e) => setCostPrice(e.target.value)}
                    className="h-10 w-full rounded-xl border border-ink-200 bg-ink-50 pl-10 pr-4 text-xs text-ink-900 focus:border-brand-500 focus:bg-white focus:outline-none dark:border-ink-700 dark:bg-ink-950 dark:text-ink-100"
                  />
                </div>
              </div>

              <div className="sm:col-span-1">
                <label className="mb-1 block text-xs font-semibold text-ink-700 dark:text-ink-200">
                  Tax Rate (%)
                </label>
                <div className="relative">
                  <Percent className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" />
                  <input
                    type="number"
                    min="0"
                    max="100"
                    placeholder="18"
                    value={taxPercentage}
                    onChange={(e) => setTaxPercentage(e.target.value)}
                    className="h-10 w-full rounded-xl border border-ink-200 bg-ink-50 pl-10 pr-4 text-xs text-ink-900 focus:border-brand-500 focus:bg-white focus:outline-none dark:border-ink-700 dark:bg-ink-950 dark:text-ink-100"
                  />
                </div>
              </div>
            </div>

            {/* Description */}
            <div>
              <label className="mb-1 block text-xs font-semibold text-ink-700 dark:text-ink-200">
                Description & Notes
              </label>
              <div className="relative">
                <FileText className="absolute left-3.5 top-3 h-4 w-4 text-ink-400" />
                <textarea
                  rows={3}
                  placeholder="Provide product specifications, warranty info, or catalog notes..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full rounded-xl border border-ink-200 bg-ink-50 pl-10 pr-4 pt-2.5 text-xs text-ink-900 focus:border-brand-500 focus:bg-white focus:outline-none dark:border-ink-700 dark:bg-ink-950 dark:text-ink-100"
                />
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex justify-end gap-2 pt-3 border-t border-ink-100 dark:border-ink-800">
              <button
                type="button"
                onClick={onClose}
                className="rounded-xl border border-ink-200 px-4 py-2 text-xs font-semibold text-ink-700 hover:bg-ink-100 dark:border-ink-700 dark:text-ink-300 dark:hover:bg-ink-800 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-brand-600 via-brand-500 to-accent-500 px-5 py-2 text-xs font-semibold text-white shadow-md shadow-brand-500/20 hover:scale-105 active:scale-95 transition-all disabled:opacity-50 cursor-pointer"
              >
                <PackagePlus className="h-4 w-4" />
                {isSubmitting ? 'Adding Product...' : 'Add Product'}
              </button>
            </div>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
