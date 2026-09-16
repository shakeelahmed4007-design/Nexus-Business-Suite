import { useState } from 'react';
import { Upload, FileSpreadsheet, AlertCircle, CheckCircle, Phone, FileText } from 'lucide-react';
import { Modal } from '@/shared/components/ui/Modal';
import { Button } from '@/shared/components/ui/Button';

interface ImportNumbersModalProps {
  open: boolean;
  onClose: () => void;
  onUpload: (numbers: string[]) => void;
  initialTab?: 'single' | 'bulk';
}

export function ImportNumbersModal({ open, onClose, onUpload, initialTab = 'single' }: ImportNumbersModalProps) {
  const [activeTab, setActiveTab] = useState<'single' | 'bulk'>(initialTab);
  const [singlePhone, setSinglePhone] = useState<string>('');
  const [csvText, setCsvText] = useState<string>('');
  const [parsedNumbers, setParsedNumbers] = useState<string[]>([]);
  const [error, setError] = useState<string>('');
  const [saving, setSaving] = useState(false);

  const formatSinglePhone = (val: string): string | null => {
    if (!val || !val.trim()) return null;
    const digitsAndPlus = val.trim().replace(/[\s\-\(\)\.\/]/g, '');
    let formatted = '';
    if (digitsAndPlus.startsWith('+')) {
      formatted = '+' + digitsAndPlus.slice(1).replace(/\D/g, '');
    } else {
      const digitsOnly = digitsAndPlus.replace(/\D/g, '');
      if (!digitsOnly) return null;
      if (digitsOnly.startsWith('03') && digitsOnly.length === 11) {
        formatted = '+92' + digitsOnly.slice(1);
      } else if (digitsOnly.startsWith('92') && (digitsOnly.length === 12 || digitsOnly.length === 11)) {
        formatted = '+' + digitsOnly;
      } else if (digitsOnly.startsWith('0') && digitsOnly.length >= 10) {
        formatted = '+92' + digitsOnly.replace(/^0+/, '');
      } else {
        formatted = '+' + digitsOnly;
      }
    }
    const count = formatted.replace(/\D/g, '').length;
    if (count >= 7 && count <= 15) return formatted;
    return null;
  };

  const formattedSingle = formatSinglePhone(singlePhone);

  const parsePhoneNumbers = (text: string): string[] => {
    if (!text || !text.trim()) return [];

    const lines = text.split(/[\n,\r;]+/);
    const result: string[] = [];

    for (let raw of lines) {
      let cleaned = raw.trim();
      if (!cleaned) continue;

      if (/^(phone|phone_number|mobile|number|contacts?|numbers?)$/i.test(cleaned)) {
        continue;
      }

      const formatted = formatSinglePhone(cleaned);
      if (formatted) {
        result.push(formatted);
      }
    }

    return Array.from(new Set(result));
  };

  const handleParse = (text: string) => {
    setCsvText(text);
    setError('');
    const numbers = parsePhoneNumbers(text);
    setParsedNumbers(numbers);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      handleParse(content);
    };
    reader.readAsText(file);
  };

  const generateSampleCsv = () => {
    const samples: string[] = [];
    for (let i = 1; i <= 50; i++) {
      const num = 3000000000 + i * 111111;
      samples.push(`+92${num}`);
    }
    const sampleText = "phone_number\n" + samples.join("\n");
    handleParse(sampleText);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    let finalNumbers: string[] = [];
    if (activeTab === 'single') {
      if (!formattedSingle) {
        setError('Please enter a valid phone number (e.g. 03001234567 or +923001234567)');
        return;
      }
      finalNumbers = [formattedSingle];
    } else {
      if (parsedNumbers.length === 0) {
        setError('Please paste or upload valid phone numbers.');
        return;
      }
      finalNumbers = parsedNumbers;
    }

    setSaving(true);
    setTimeout(() => {
      onUpload(finalNumbers);
      setSaving(false);
      setSinglePhone('');
      setCsvText('');
      setParsedNumbers([]);
      onClose();
    }, 300);
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Add Calling Numbers to Pool"
      subtitle="Add a single phone number or import bulk numbers into raw calling pool."
    >
      <form onSubmit={handleSubmit} className="space-y-4 pt-2">
        {/* Mode Selector Tabs */}
        <div className="grid grid-cols-2 gap-2 rounded-xl bg-ink-100 p-1 dark:bg-ink-800">
          <button
            type="button"
            onClick={() => { setActiveTab('single'); setError(''); }}
            className={`flex items-center justify-center gap-2 rounded-lg py-2 text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'single'
                ? 'bg-white text-brand-600 shadow-sm dark:bg-ink-900 dark:text-brand-400'
                : 'text-ink-600 hover:text-ink-900 dark:text-ink-300 dark:hover:text-white'
            }`}
          >
            <Phone className="h-4 w-4" /> Add Single Number
          </button>
          <button
            type="button"
            onClick={() => { setActiveTab('bulk'); setError(''); }}
            className={`flex items-center justify-center gap-2 rounded-lg py-2 text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'bulk'
                ? 'bg-white text-brand-600 shadow-sm dark:bg-ink-900 dark:text-brand-400'
                : 'text-ink-600 hover:text-ink-900 dark:text-ink-300 dark:hover:text-white'
            }`}
          >
            <FileText className="h-4 w-4" /> Bulk CSV / Text Import
          </button>
        </div>

        {activeTab === 'single' ? (
          <div className="space-y-3 rounded-2xl border border-ink-200 bg-ink-50/50 p-5 dark:border-ink-700 dark:bg-ink-900/50">
            <div>
              <label className="mb-1.5 flex items-center gap-1.5 text-xs font-bold text-ink-800 dark:text-ink-200">
                <Phone className="h-4 w-4 text-brand-500" /> Enter Phone Number
              </label>
              <input
                type="text"
                placeholder="e.g. 03001234567 or +923001234567"
                value={singlePhone}
                onChange={(e) => {
                  setSinglePhone(e.target.value);
                  setError('');
                }}
                className="h-11 w-full font-mono text-sm rounded-xl border border-ink-200 bg-white px-3 text-ink-900 focus:border-brand-500 focus:outline-none dark:border-ink-700 dark:bg-ink-800 dark:text-white"
                autoFocus
              />
            </div>

            {formattedSingle && (
              <div className="flex items-center gap-2 rounded-xl bg-emerald-50 p-3 text-xs font-semibold text-emerald-800 dark:bg-emerald-500/10 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-500/20">
                <CheckCircle className="h-4 w-4 shrink-0 text-emerald-600" />
                Valid number format: <span className="font-mono font-bold">{formattedSingle}</span> ready to add to pool!
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {/* Upload Box */}
            <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-ink-200 bg-ink-50/50 p-5 text-center transition-colors hover:border-brand-400 dark:border-ink-700 dark:bg-ink-900/50">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-50 text-brand-600 dark:bg-brand-500/10 dark:text-brand-400">
                <Upload className="h-5 w-5" />
              </div>
              <p className="mt-2 text-xs font-semibold text-ink-800 dark:text-ink-200">
                Drag & drop CSV file or click to browse
              </p>
              <p className="mt-0.5 text-[11px] text-ink-400">
                Format: One phone number per line or comma separated (+923001234567)
              </p>
              <input
                type="file"
                accept=".csv,.txt"
                onChange={handleFileUpload}
                className="mt-2 text-xs text-ink-500 file:mr-3 file:rounded-lg file:border-0 file:bg-brand-600 file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-white hover:file:bg-brand-700 cursor-pointer"
              />
            </div>

            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-ink-600 dark:text-ink-300">Or Paste Numbers Text:</span>
              <button
                type="button"
                onClick={generateSampleCsv}
                className="flex items-center gap-1 font-medium text-brand-600 hover:underline dark:text-brand-400"
              >
                <FileSpreadsheet className="h-3.5 w-3.5" /> Load Sample 50 Numbers
              </button>
            </div>

            <textarea
              rows={4}
              value={csvText}
              onChange={(e) => handleParse(e.target.value)}
              placeholder={`+923001234567\n+923119876543\n+923214567890`}
              className="w-full font-mono text-xs rounded-xl border border-ink-200 bg-white p-3 text-ink-800 focus:border-brand-400 focus:outline-none dark:border-ink-700 dark:bg-ink-900 dark:text-ink-100"
            />

            {parsedNumbers.length > 0 && (
              <div className="flex items-center gap-2 rounded-xl bg-emerald-50 p-3 text-xs font-semibold text-emerald-800 dark:bg-emerald-500/10 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-500/20">
                <CheckCircle className="h-4 w-4 shrink-0 text-emerald-600" />
                Detected {parsedNumbers.length} valid phone numbers ready to import into pool!
              </div>
            )}
          </div>
        )}

        {error && (
          <p className="flex items-center gap-1.5 text-xs font-semibold text-rose-600">
            <AlertCircle className="h-4 w-4" /> {error}
          </p>
        )}

        <div className="flex justify-end gap-3 border-t border-ink-200 pt-4 dark:border-ink-800">
          <Button type="button" variant="ghost" size="sm" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button
            type="submit"
            size="sm"
            disabled={saving || (activeTab === 'single' ? !formattedSingle : parsedNumbers.length === 0)}
          >
            {saving
              ? 'Adding...'
              : activeTab === 'single'
              ? 'Add 1 Number to Pool'
              : `Upload ${parsedNumbers.length} Numbers`}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
