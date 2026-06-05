import React, { useState, useEffect } from 'react';
import { apiFetch } from '../lib/api';
import { 
  FolderLock, Tag, Plus, Trash2, Search, Download, 
  FileVideo, RefreshCw, AlertCircle, CheckCircle2, ListFilter
} from 'lucide-react';
import { Video, CustomFolder } from '../types';

interface CategoryManagerProps {
  videos: Video[];
  onRefresh: () => void;
}

export default function CategoryManager({ videos, onRefresh }: CategoryManagerProps) {
  const [categories, setCategories] = useState<string[]>([]);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [folders, setFolders] = useState<CustomFolder[]>([]);
  
  // Search query state
  const [searchText, setSearchText] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  
  // Feedback states
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchCategories();
    fetchFoldersSilently();
  }, []);

  const fetchFoldersSilently = async () => {
    try {
      const res = await apiFetch('/api/custom-folders');
      if (res.ok) {
        const data = await res.json();
        setFolders(data);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const fetchCategories = async () => {
    try {
      const res = await apiFetch('/api/categories');
      if (res.ok) {
        const data = await res.json();
        setCategories(data);
      }
    } catch (err) {
      console.error("Error loading categories:", err);
    }
  };

  const handleAddCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCategoryName.trim()) return;

    setLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      const res = await apiFetch('/api/categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newCategoryName.trim() })
      });

      if (res.ok) {
        const data = await res.json();
        setCategories(data.categories);
        setNewCategoryName('');
        setSuccessMsg(`Category "${newCategoryName.trim()}" added successfully!`);
        onRefresh();
      } else {
        const errData = await res.json();
        setErrorMsg(errData.error || "Failed to add category");
      }
    } catch (err) {
      setErrorMsg("Network error trying to insert category.");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteCategory = async (name: string) => {
    if (!window.confirm(`Are you sure you want to remove the "${name}" category tag?`)) {
      return;
    }

    setLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      const res = await apiFetch(`/api/categories/${encodeURIComponent(name)}`, {
        method: 'DELETE'
      });

      if (res.ok) {
        const data = await res.json();
        setCategories(data.categories);
        setSuccessMsg(`Category "${name}" deleted successfully.`);
        if (selectedCategory === name) {
          setSelectedCategory('');
        }
        onRefresh();
      } else {
        const errData = await res.json();
        setErrorMsg(errData.error || "Failed to delete category");
      }
    } catch (err) {
      setErrorMsg("Network error trying to delete category.");
    } finally {
      setLoading(false);
    }
  };

  // Live filter matching search text and selected category
  const filteredVideos = videos.filter(v => {
    // Check search text: matches name or code
    const isTextMatch = !searchText.trim() || 
      v.name.toLowerCase().includes(searchText.toLowerCase()) ||
      v.unique_code.toLowerCase().includes(searchText.toLowerCase());

    // Check category dropdown selection
    const isCategoryMatch = !selectedCategory || 
      (v.video_category && v.video_category.toLowerCase() === selectedCategory.toLowerCase()) ||
      (!v.video_category && selectedCategory.toLowerCase() === 'marketing'); // compatibility fallback

    return isTextMatch && isCategoryMatch;
  });

  // Export filtered search result table or entire category to CSV structure
  const handleDownloadXls = () => {
    if (filteredVideos.length === 0) {
      setErrorMsg("No records to export.");
      return;
    }

    let csvContent = "";
    csvContent += "S.N.,Video Name,Unique Code,Recorded Date,Operator Name,Factory Name,Factory Code\n";

    filteredVideos.forEach((v, idx) => {
      const sn = idx + 1;
      const vName = v.name.replace(/"/g, '""');
      const uCode = v.unique_code;
      const recDate = v.recorded_date || '';
      const opName = v.operator_name || '';
      const factoryName = v.category || '';
      
      const matchedFolder = folders.find(cf => cf.category.toLowerCase() === factoryName.toLowerCase());
      const factoryCode = matchedFolder?.factory_code || v.factory_code || '';

      const csvRow = `${sn},"${vName}","${uCode}","${recDate}","${opName}","${factoryName}","${factoryCode}"\n`;
      csvContent += csvRow;
    });

    const filename = selectedCategory ? selectedCategory.replace(/\s+/g, '_') : 'Search_Results';
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const downloadAnchor = document.createElement("a");
    const url = URL.createObjectURL(blob);
    downloadAnchor.setAttribute("href", url);
    downloadAnchor.setAttribute("download", `CANTOR_DUST_Category_${filename}.csv`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    document.body.removeChild(downloadAnchor);
    setSuccessMsg(`✓ Successfully downloaded spreadsheet listing ${filteredVideos.length} videos.`);
  };

  return (
    <div className="space-y-8 animate-fade-in text-slate-200">
      
      {/* HEADER SECTION */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between border-b pb-4 border-slate-850">
        <div>
          <h2 className="text-2xl font-black text-slate-100 tracking-tight flex items-center gap-2.5">
            <Tag className="h-6 w-6 text-indigo-400" />
            Category & Classification Center
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Register classification categories, perform global search filters across directories, and download targeted records spreadsheets.
          </p>
        </div>
      </div>

      {/* FEEDBACK POPUPS */}
      <div className="space-y-2">
        {errorMsg && (
          <div className="p-3 bg-red-950/40 border border-red-900/30 rounded-xl text-xs text-red-400 flex items-center gap-2">
            <AlertCircle className="h-4.5 w-4.5 shrink-0" />
            <span className="flex-1">{errorMsg}</span>
            <button onClick={() => setErrorMsg(null)} className="font-bold text-slate-400 hover:text-white px-1">✕</button>
          </div>
        )}
        {successMsg && (
          <div className="p-3 bg-emerald-950/30 border border-emerald-900/20 rounded-xl text-xs text-emerald-400 flex items-center gap-2">
            <CheckCircle2 className="h-4.5 w-4.5 shrink-0" />
            <span className="flex-1">{successMsg}</span>
            <button onClick={() => setSuccessMsg(null)} className="font-bold text-slate-400 hover:text-white px-1">✕</button>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* COLUMN 1: CATEGORY CREATION & LIST MANAGEMENT */}
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-slate-900 border border-slate-850 rounded-xl p-5 shadow-xl space-y-5">
            <div>
              <h3 className="text-xs font-bold uppercase tracking-widest text-indigo-400">Add Category Tag</h3>
              <p className="text-[10px] text-slate-500 mt-0.5">Define classifications to sign uploading video stages</p>
            </div>

            <form onSubmit={handleAddCategory} className="flex gap-2">
              <input
                type="text"
                value={newCategoryName}
                onChange={(e) => setNewCategoryName(e.target.value)}
                placeholder="Enter unique tag name..."
                className="flex-1 bg-slate-950 border border-slate-800 focus:border-indigo-500 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none"
                maxLength={40}
                required
              />
              <button
                type="submit"
                disabled={loading || !newCategoryName.trim()}
                className="bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-800 disabled:text-slate-500 py-2 px-3.5 rounded-lg text-xs font-bold uppercase tracking-wider text-white transition-all cursor-pointer flex items-center gap-1 shrink-0"
              >
                {loading ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-4 w-4" />}
                Add
              </button>
            </form>

            <div className="border-t border-slate-850 pt-4 space-y-3">
              <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest">Active Classifications ({categories.length})</span>
              
              <div className="max-h-[350px] overflow-y-auto space-y-2 pr-1">
                {categories.length === 0 ? (
                  <p className="text-[11px] text-slate-500 font-mono italic">No custom category tags found.</p>
                ) : (
                  categories.map((cat) => (
                    <div 
                      key={cat} 
                      className="flex items-center justify-between p-2.5 bg-slate-950/40 border border-slate-850 rounded-lg hover:border-slate-800 transition-colors group"
                    >
                      <span className="text-xs font-medium text-slate-200 flex items-center gap-2">
                        <Tag className="h-3 w-3 text-indigo-400" />
                        {cat}
                      </span>
                      {categories.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleDeleteCategory(cat)}
                          className="opacity-0 group-hover:opacity-100 text-slate-500 hover:text-red-400 transition-opacity p-1 hover:bg-slate-900 rounded"
                          title={`Delete Category ${cat}`}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>

        {/* COLUMN 2 & 3: CATEGORY SEARCH & FILTER CONSOLE */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-slate-900 border border-slate-850 rounded-xl p-6 shadow-xl space-y-5">
            
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-850 pb-4">
              <div>
                <h3 className="text-sm font-bold uppercase tracking-widest text-slate-300">Catalog Search Console</h3>
                <p className="text-[11px] text-slate-500 mt-0.5">Filter videos independently of parent folders</p>
              </div>

              {filteredVideos.length > 0 && (
                <button
                  type="button"
                  onClick={handleDownloadXls}
                  className="bg-indigo-605/15 hover:bg-indigo-600/10 border border-indigo-505 bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 rounded-lg text-xs font-bold px-3 py-2 tracking-wide flex items-center gap-2 self-start cursor-pointer transition-all"
                >
                  <Download className="h-4 w-4" />
                  Download XLS Spreadsheet
                </button>
              )}
            </div>

            {/* Manual input + dropdown search bar */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="relative">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-550 text-slate-550 text-slate-500 pointer-events-none" />
                <input
                  type="text"
                  value={searchText}
                  onChange={(e) => setSearchText(e.target.value)}
                  placeholder="Insert video title or unique code..."
                  className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500 rounded-lg pl-9 pr-3 py-2 text-xs text-slate-200 focus:outline-none"
                />
              </div>

              <div className="relative">
                <ListFilter className="absolute left-3 top-2.5 h-4 w-4 text-slate-500 pointer-events-none" />
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500 rounded-lg pl-9 pr-3 py-2 text-xs text-slate-200 focus:outline-none cursor-pointer"
                >
                  <option value="">-- All Categories --</option>
                  {categories.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* RESULTS TABLE */}
            <div className="border border-slate-850 rounded-xl overflow-hidden bg-slate-950/20">
              {filteredVideos.length === 0 ? (
                <div className="py-12 text-center text-slate-500 space-y-2">
                  <FileVideo className="h-10 w-10 mx-auto text-slate-700 font-light" />
                  <p className="text-xs font-mono font-bold tracking-wider">No corresponding videos match the filter</p>
                  <p className="text-[11px] text-slate-600 max-w-sm mx-auto font-sans">
                    Modify your query in search console above or assign different categories during ingest stage.
                  </p>
                </div>
              ) : (
                <div className="rounded-xl overflow-hidden border border-slate-800 bg-slate-950/20 shadow-lg text-xs">
                  {/* EXCEL SHEET ACCENTS & FORMULA BAR */}
                  <div className="bg-slate-900 border-b border-slate-800 px-3 py-2 flex items-center gap-2 text-[10px] font-mono text-slate-400 select-none">
                    <div className="bg-slate-950 px-2 py-0.5 rounded text-emerald-400 font-bold border border-slate-800/80 shrink-0">
                      CLASSIFICATION_SHEET
                    </div>
                    <span className="text-slate-600">|</span>
                    <div className="bg-slate-950 border border-slate-805/40 px-2 py-0.5 rounded text-slate-500 flex items-center gap-1.5 w-16 text-center">
                      <span className="text-rose-500 font-black">fx</span>
                      <span>=COUNT</span>
                    </div>
                    <div className="bg-slate-950/50 border border-slate-800/60 rounded px-2.5 py-0.5 flex-1 text-slate-350 truncate">
                      {filteredVideos.length === 0 ? "EMPTY_SHEET" : `=COUNTIF(E2:E${filteredVideos.length + 1}, "${selectedCategory || 'All'}") | ${filteredVideos.length} classification rows`}
                    </div>
                  </div>

                  <div className="overflow-x-auto min-w-full">
                    <table className="min-w-full border-collapse text-left text-xs text-slate-200">
                      {/* COLUMN INDICATOR TIER */}
                      <thead className="bg-slate-900/90 text-[10px] text-slate-400 font-mono select-none">
                        <tr className="divide-x divide-slate-800 border-b border-slate-800">
                          <th className="w-10 text-center bg-slate-950 text-[9px] text-slate-600 font-bold border-r border-slate-850"></th>
                          <th className="px-3 py-1 text-center bg-slate-950/60 w-16">A</th>
                          <th className="px-3 py-1 text-center bg-slate-950/60">B</th>
                          <th className="px-3 py-1 text-center bg-slate-950/60 w-32">C</th>
                          <th className="px-3 py-1 text-center bg-slate-950/60 w-28">D</th>
                          <th className="px-3 py-1 text-center bg-slate-950/60 w-28">E</th>
                          <th className="px-3 py-1 text-center bg-slate-950/60 w-28">F</th>
                          <th className="px-3 py-1 text-center bg-slate-950/60 w-28 font-bold">G</th>
                        </tr>
                        <tr className="bg-slate-950/70 border-b border-slate-800 text-[10px] md:text-[11px] text-slate-300 font-bold uppercase tracking-wider divide-x divide-slate-800/80">
                          <th className="w-10 text-center bg-slate-950/80 text-slate-500 font-bold border-r border-slate-850 py-2">Row</th>
                          <th scope="col" className="px-3 py-2 font-mono text-center">ID</th>
                          <th scope="col" className="px-3 py-2">Video Title</th>
                          <th scope="col" className="px-3 py-2 text-center font-mono">Unique Code</th>
                          <th scope="col" className="px-3 py-2 text-center font-mono text-slate-400">Recorded Date</th>
                          <th scope="col" className="px-3 py-2 font-mono text-center">Category</th>
                          <th scope="col" className="px-3 py-2 text-center">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/60">
                        {filteredVideos.map((vid, idx) => {
                          const matchedFolder = folders.find(cf => cf.category.toLowerCase() === (vid.category || '').toLowerCase());
                          const fCode = matchedFolder?.factory_code || vid.factory_code || '';

                          return (
                            <tr 
                              key={vid.id} 
                              className="hover:bg-slate-850/20 bg-slate-950/5 transition-all divide-x divide-slate-800/60 border-b border-slate-800/60 text-slate-100 font-sans"
                            >
                              {/* Row Indicator column equivalent to standard Excel numbers */}
                              <td className="w-10 text-center bg-slate-950/90 text-slate-500 font-mono text-[9px] font-bold border-r border-slate-850 select-none py-2">
                                {idx + 2}
                              </td>

                              {/* ID */}
                              <td className="px-3 py-2 font-mono font-bold text-slate-500 text-center text-[11px] whitespace-nowrap">{vid.id}</td>

                              {/* Video Title */}
                              <td className="px-3 py-2 font-medium text-slate-200">
                                <div>
                                  <p className="text-xs">{vid.name}</p>
                                  {vid.category && (
                                    <span className="text-[9px] text-slate-500 block mt-0.5">
                                      Folder Workspace: <strong className="text-slate-400">{vid.category}</strong> {vid.sub_category ? ` ➔ ${vid.sub_category}` : ''}
                                      {fCode && <span className="text-emerald-400 font-mono ml-1.5">({fCode})</span>}
                                    </span>
                                  )}
                                </div>
                              </td>

                              {/* Unique Code */}
                              <td className="px-3 py-2 font-mono text-slate-350 text-center text-[10px] whitespace-nowrap">
                                <span className="bg-slate-950 border border-slate-800/80 px-2 py-0.5 rounded uppercase tracking-wide text-indigo-300">
                                  {vid.unique_code}
                                </span>
                              </td>

                              {/* Recorded Date */}
                              <td className="px-3 py-2 text-indigo-350 font-mono text-[10px] text-center whitespace-nowrap">
                                {vid.recorded_date || 'N/A'}
                              </td>

                            {/* Category */}
                            <td className="px-3 py-2 font-mono font-semibold text-[11px] text-center text-indigo-400 whitespace-nowrap">
                              {vid.video_category || 'Marketing'}
                            </td>

                            {/* Status */}
                            <td className="px-3 py-2 text-center whitespace-nowrap">
                              {vid.status === 'uploaded' ? (
                                <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 uppercase tracking-wider font-sans select-none">
                                  uploaded
                                </span>
                              ) : (
                                <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-bold bg-amber-500/10 text-amber-500 border border-amber-500/20 uppercase tracking-wider font-sans select-none">
                                  not uploaded
                                </span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>

          </div>
        </div>

      </div>

    </div>
  );
}
