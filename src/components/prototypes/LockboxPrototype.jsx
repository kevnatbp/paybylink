import React, { useState } from 'react';
import {
  Upload, Search, FileText, Settings, ListChecks, X,
  AlertCircle, CheckCircle, TrendingUp,
  DollarSign, FileCheck, AlertTriangle
} from 'lucide-react';
import {
  mockFiles,
  mockBatches,
  mockTransactionsByFile,
  mockRules,
  mockAllocations
} from '../../data/cashAppMockData';

const LockboxPrototype = () => {
  const [selectedFile, setSelectedFile] = useState(null);
  const [selectedTransaction, setSelectedTransaction] = useState(null);
  const [onlyUncompleted, setOnlyUncompleted] = useState(false);
  
  // Configuration flags for modular sections
  const [hasLockboxConfig, setHasLockboxConfig] = useState(true);
  const [hasCashAppConfig, setHasCashAppConfig] = useState(true);

  const transactions = selectedFile ? mockTransactionsByFile[selectedFile.id] || [] : [];

  const handleFileUpload = (e) => {
    console.log('File selected:', e.target.files[0]);
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: '2-digit',
      day: '2-digit',
      year: 'numeric'
    });
  };

  const formatDateTime = (dateString) => {
    return new Date(dateString).toLocaleString('en-US', {
      month: '2-digit',
      day: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Calculate KPIs
  const totalAmount = mockFiles.reduce((sum, file) => sum + file.totalAmount, 0);
  const totalTransactions = mockFiles.reduce((sum, file) => sum + file.totalTransactions, 0);
  const totalToProcess = mockFiles.reduce((sum, file) => sum + file.numberToProcess, 0);
  const allTransactions = Object.values(mockTransactionsByFile).flat();
  const allocatedTransactions = allTransactions.filter(t => t.remaining === 0).length;
  const allocationSuccessRate = allTransactions.length > 0
    ? Math.round((allocatedTransactions / allTransactions.length) * 100)
    : 0;

  // Get exceptions (unreconciled transactions)
  const exceptions = allTransactions.filter(t => t.remaining > 0);

  const filteredFiles = mockFiles.filter(file => {
    if (onlyUncompleted && file.numberToProcess === 0) return false;
    return true;
  });

  const getFileStatus = (file) => {
    if (file.numberToProcess === 0) return { label: 'Complete', color: 'bg-green-100 text-green-700' };
    if (file.numberToProcess < file.totalTransactions * 0.5) return { label: 'Partial', color: 'bg-yellow-100 text-yellow-700' };
    return { label: 'Needs Review', color: 'bg-red-100 text-red-700' };
  };

  // const getBatchStatus = (status) => {
  //   const statusMap = {
  //     'Posted': { color: 'bg-green-100 text-green-700', icon: CheckCircle },
  //     'Accepted': { color: 'bg-blue-100 text-blue-700', icon: Clock },
  //     'Pending': { color: 'bg-yellow-100 text-yellow-700', icon: Clock }
  //   };
  //   return statusMap[status] || { color: 'bg-gray-100 text-gray-700', icon: Clock };
  // };

  return (
    <div className="w-full bg-slate-50">
      {/* HEADER */}
      <div className="border-b bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <h1 className="text-xl font-semibold text-slate-800">Lockbox Processing Dashboard</h1>
        </div>
      </div>

      {/* MAIN CONTENT - Narrow container with margins */}
      <div className="max-w-7xl mx-auto w-full px-6 py-6 space-y-6 pb-20">
        {/* KPI CARDS */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white border rounded-lg shadow-sm p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-slate-500 uppercase tracking-wide">Files Today</p>
                <p className="text-2xl font-bold text-slate-800 mt-1">{mockFiles.length}</p>
                <p className="text-xs text-slate-400 mt-1">{mockBatches.length} batches created</p>
              </div>
              <FileCheck className="h-8 w-8 text-slate-500" />
            </div>
          </div>

          <div className="bg-white border rounded-lg shadow-sm p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-slate-500 uppercase tracking-wide">Total Processed</p>
                <p className="text-2xl font-bold text-slate-800 mt-1">{formatCurrency(totalAmount)}</p>
                <p className="text-xs text-slate-400 mt-1">{totalTransactions.toLocaleString()} transactions</p>
              </div>
              <DollarSign className="h-8 w-8 text-blue-500" />
            </div>
          </div>

          <div className="bg-white border rounded-lg shadow-sm p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-slate-500 uppercase tracking-wide">Allocation Rate</p>
                <p className="text-2xl font-bold text-green-600 mt-1">{allocationSuccessRate}%</p>
                <p className="text-xs text-slate-400 mt-1">{allocatedTransactions} of {allTransactions.length} matched</p>
              </div>
              <TrendingUp className="h-8 w-8 text-green-500" />
            </div>
          </div>

          <div className="bg-white border rounded-lg shadow-sm p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-slate-500 uppercase tracking-wide">Requires Attention</p>
                <p className="text-2xl font-bold text-orange-600 mt-1">{totalToProcess}</p>
                <p className="text-xs text-slate-400 mt-1">{exceptions.length} unreconciled</p>
              </div>
              <AlertCircle className="h-8 w-8 text-orange-500" />
            </div>
          </div>
        </div>

        {/* 2-COLUMN LAYOUT: LEFT (Import/Search/Files) + RIGHT (Actions Required) */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* LEFT COLUMN: Import, Search, Files */}
          <div className="flex flex-col space-y-4 h-full">
            {/* Import Controls */}
            <div className="bg-white border rounded-lg shadow-sm p-4 flex-shrink-0">
              <div className="flex items-center gap-3">
                <p className="text-sm font-semibold text-slate-700 whitespace-nowrap">Import File</p>
                <input
                  type="file"
                  onChange={handleFileUpload}
                  className="text-xs flex-1 file:mr-2 file:py-1 file:px-2 file:rounded file:border file:border-slate-300 file:text-xs file:bg-white file:text-slate-700 hover:file:bg-slate-50 file:cursor-pointer border-0"
                />
                <button className="flex-shrink-0 px-3 py-1.5 bg-blue-600 text-white rounded text-xs hover:bg-blue-700 font-medium flex items-center space-x-1 whitespace-nowrap">
                  <Upload className="h-3 w-3" />
                  <span>Import</span>
                </button>
              </div>
            </div>

            {/* Search Controls */}
            <div className="bg-white border rounded-lg shadow-sm p-4 space-y-2 flex-shrink-0">
              <div className="flex items-center gap-2">
                <p className="text-sm font-semibold text-slate-700 whitespace-nowrap">Search Files</p>
                <div className="flex items-center gap-2 flex-1">
                  <label className="text-xs text-slate-600 whitespace-nowrap">From</label>
                  <input type="date" className="border border-slate-300 rounded px-2 py-1 text-xs" />
                  <label className="text-xs text-slate-600 whitespace-nowrap">To</label>
                  <input type="date" className="border border-slate-300 rounded px-2 py-1 text-xs" />
                </div>
                <button className="flex-shrink-0 px-3 py-1.5 bg-blue-600 text-white rounded text-xs hover:bg-blue-700 flex items-center space-x-1 whitespace-nowrap">
                  <Search className="h-3 w-3" />
                  <span>Search</span>
                </button>
              </div>
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="uncompleted"
                  checked={onlyUncompleted}
                  onChange={(e) => setOnlyUncompleted(e.target.checked)}
                  className="rounded"
                />
                <label htmlFor="uncompleted" className="text-xs text-slate-600">
                  Only uncompleted files
                </label>
              </div>
            </div>

            {/* FILES SECTION */}
            <div className="bg-white border rounded-lg shadow-sm p-4 flex-1 flex flex-col min-h-0">
              <h2 className="text-lg font-semibold text-slate-800 mb-3 flex-shrink-0">Files</h2>
              <div className="border rounded-lg overflow-hidden flex-1 flex flex-col min-h-0">
                <div className="overflow-y-auto flex-1">
                  <table className="w-full text-xs">
                    <thead className="bg-slate-50 sticky top-0 z-10">
                      <tr className="border-b">
                        <th className="text-left p-2 font-medium text-slate-700">Date Range</th>
                        <th className="text-right p-2 font-medium text-slate-700">Trans.</th>
                        <th className="text-right p-2 font-medium text-slate-700">Amount</th>
                        <th className="text-right p-2 font-medium text-slate-700">To Process</th>
                        <th className="text-center p-2 font-medium text-slate-700">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredFiles.map((file) => {
                        const status = getFileStatus(file);
                        return (
                          <tr
                            key={file.id}
                            onClick={() => setSelectedFile(file)}
                            className={`border-b cursor-pointer hover:bg-slate-50 transition-colors ${
                              selectedFile?.id === file.id ? 'bg-blue-50' : ''
                            }`}
                          >
                            <td className="p-2 whitespace-nowrap">{formatDate(file.dateFrom)}</td>
                            <td className="text-right p-2">{file.totalTransactions.toLocaleString()}</td>
                            <td className="text-right p-2">{formatCurrency(file.totalAmount)}</td>
                            <td className="text-right p-2 font-medium">{file.numberToProcess}</td>
                            <td className="text-center p-2">
                              <span className={`px-2 py-0.5 rounded text-xs font-medium ${status.color}`}>
                                {status.label}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>

          {/* RIGHT COLUMN: Actions Required */}
          <div className="lg:sticky lg:top-6 lg:self-start flex flex-col h-full">
            {exceptions.length > 0 && (
              <div className="bg-white border border-orange-200 rounded-lg shadow-sm p-4 flex-1 flex flex-col min-h-0">
                <h2 className="text-lg font-semibold text-slate-800 mb-3 flex-shrink-0">Action Required</h2>
                <div className="border rounded-lg overflow-hidden flex-1 flex flex-col min-h-0">
                  <div className="overflow-y-auto flex-1">
                    <table className="w-full text-xs">
                      <thead className="bg-orange-100 sticky top-0 z-10">
                        <tr className="border-b border-orange-200">
                          <th className="text-left p-2 font-medium text-slate-700">Date</th>
                          <th className="text-left p-2 font-medium text-slate-700">Other Party</th>
                          <th className="text-right p-2 font-medium text-slate-700">Amount</th>
                          <th className="text-right p-2 font-medium text-slate-700">Remaining</th>
                          <th className="text-left p-2 font-medium text-slate-700">Reason</th>
                          <th className="text-center p-2 font-medium text-slate-700">Action</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white">
                        {exceptions.map((txn) => {
                          const fileForTxn = Object.entries(mockTransactionsByFile).find(([_, txns]) =>
                            txns.some(t => t.id === txn.id)
                          );

                          return (
                            <tr
                              key={txn.id}
                              className="border-b border-orange-200 hover:bg-orange-50 transition-colors"
                            >
                              <td className="p-2 whitespace-nowrap">{formatDate(txn.date)}</td>
                              <td className="p-2">
                                <span className="font-medium text-slate-700 truncate block max-w-[120px]" title={txn.otherParty}>
                                  {txn.otherParty}
                                </span>
                              </td>
                              <td className="text-right p-2 font-medium text-slate-700">{formatCurrency(txn.amount)}</td>
                              <td className="text-right p-2 font-medium text-orange-600">{formatCurrency(txn.remaining)}</td>
                              <td className="p-2 text-slate-700">
                                {txn.rulesApplied.length === 0 ? 'No rules matched' : 'Partial allocation'}
                              </td>
                              <td className="p-2 text-center">
                                <button
                                  onClick={() => {
                                    if (fileForTxn) {
                                      const file = mockFiles.find(f => f.id === fileForTxn[0]);
                                      setSelectedFile(file);
                                      setSelectedTransaction(txn);
                                    }
                                  }}
                                  className="px-3 py-1.5 bg-orange-600 text-white rounded-md text-xs font-medium hover:bg-orange-700 whitespace-nowrap"
                                >
                                  Review
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* TRANSACTIONS - Below Files and Batches */}
        <div className="bg-white border rounded-lg shadow-sm p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-slate-800 flex items-center space-x-2">
              <ListChecks className="h-6 w-6 text-slate-700" />
              <span>Transactions</span>
              {selectedFile && (
                <span className="text-sm text-slate-500 ml-2 font-normal">
                  ({transactions.length} transactions from {selectedFile.fileName || 'selected file'})
                </span>
              )}
            </h2>
            {!selectedFile && (
              <p className="text-sm text-slate-500">Select a file above to view transactions</p>
            )}
          </div>

          <div className="border rounded-lg overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 sticky top-0">
                  <tr className="border-b">
                    <th className="w-8 p-3"></th>
                    <th className="text-left p-3 font-medium text-slate-700">Date</th>
                    <th className="text-left p-3 font-medium text-slate-700">Other Party</th>
                    <th className="text-right p-3 font-medium text-slate-700">Amount</th>
                    <th className="text-right p-3 font-medium text-slate-700">Remaining</th>
                    <th className="text-center p-3 font-medium text-slate-700">Match Status</th>
                    <th className="text-center p-3 font-medium text-slate-700">Allocation Status</th>
                  </tr>
                </thead>
                <tbody>
                  {!selectedFile ? (
                    <tr>
                      <td colSpan="7" className="p-12 text-center text-slate-400">
                        <ListChecks className="h-12 w-12 mx-auto mb-3 text-slate-300" />
                        <p className="text-base">Select a file to view transactions</p>
                        <p className="text-sm mt-1">Use the file browser above to get started</p>
                      </td>
                    </tr>
                  ) : (
                    transactions.map((txn) => (
                      <tr
                        key={txn.id}
                        onClick={() => setSelectedTransaction(txn)}
                        className={`border-b cursor-pointer hover:bg-slate-50 transition-colors ${
                          selectedTransaction?.id === txn.id ? 'bg-blue-50 border-blue-200' : ''
                        }`}
                      >
                        <td className="p-3">
                          <input type="checkbox" checked={txn.skip} readOnly className="rounded" />
                        </td>
                        <td className="p-3">{formatDate(txn.date)}</td>
                        <td className="p-3 font-medium">{txn.otherParty}</td>
                        <td className="text-right p-3">{formatCurrency(txn.amount)}</td>
                        <td className="text-right p-3 font-medium">
                          <span className={txn.remaining > 0 ? 'text-orange-600' : 'text-green-600'}>
                            {formatCurrency(txn.remaining)}
                          </span>
                        </td>
                        <td className="text-center p-3">
                          {txn.rulesApplied && txn.rulesApplied.length > 0 ? (
                            <span className="px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700">
                              Matched
                            </span>
                          ) : (
                            <span className="px-3 py-1 rounded-full text-xs font-medium bg-red-100 text-red-700">
                              No Match
                            </span>
                          )}
                        </td>
                        <td className="text-center p-3">
                          {txn.remaining === 0 ? (
                            <span className="px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700">
                              Fully Allocated
                            </span>
                          ) : txn.allocations.length > 0 ? (
                            <span className="px-3 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-700">
                              Partially Allocated
                            </span>
                          ) : (
                            <span className="px-3 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-700">
                              Unallocated
                            </span>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* MODULAR SECTIONS: Rules and Allocation (always visible) */}
        {(hasLockboxConfig || hasCashAppConfig) && (
          <div className={`grid gap-6 ${hasLockboxConfig && hasCashAppConfig ? 'grid-cols-1 lg:grid-cols-2' : 'grid-cols-1'}`}>
            {/* RULES SECTION - Conditional */}
            {hasCashAppConfig && (
              <div className="bg-white border rounded-lg shadow-sm p-5">
                <h3 className="text-lg font-semibold text-slate-800 mb-4 flex items-center space-x-2">
                  <Settings className="h-5 w-5 text-slate-700" />
                  <span>Cash Application Rules</span>
                </h3>

                <div className="min-h-[200px]">
                  {!selectedTransaction ? (
                    <div className="text-center py-8">
                      <Settings className="h-10 w-10 text-slate-300 mx-auto mb-3" />
                      <p className="text-sm text-slate-600">Select a transaction to view rules or <button className="text-blue-600 hover:text-blue-700 underline">view all rules</button></p>
                    </div>
                  ) : selectedTransaction.rulesApplied.length === 0 ? (
                    <div className="text-center py-8">
                      <AlertCircle className="h-10 w-10 text-orange-400 mx-auto mb-3" />
                      <p className="text-sm text-orange-600 font-medium">No rules matched</p>
                      <p className="text-xs text-slate-500 mt-1">This transaction requires manual allocation</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {selectedTransaction.rulesApplied.map((ruleId) => {
                        const rule = mockRules[ruleId];
                        if (!rule) return null;

                        return (
                          <div key={rule.id} className="border border-slate-200 rounded-lg p-4 bg-slate-50">
                            <div className="flex items-start justify-between mb-2">
                              <div className="flex-1">
                                <p className="text-sm font-semibold text-slate-800">{rule.name}</p>
                                <p className="text-xs text-slate-500 mt-1">{rule.description}</p>
                              </div>
                              <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs font-medium">
                                Priority {rule.priority}
                              </span>
                            </div>
                            <div className="text-xs text-slate-600 mt-2 pt-2 border-t border-slate-200">
                              <p className="font-medium">Action: {rule.action.type}</p>
                              <p className="text-slate-500">Created by: {rule.createdBy}</p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* ALLOCATION SECTION - Conditional */}
            {hasLockboxConfig && (
              <div className="bg-white border rounded-lg shadow-sm p-5">
                <h3 className="text-lg font-semibold text-slate-800 mb-4 flex items-center space-x-2">
                  <FileText className="h-5 w-5 text-slate-700" />
                  <span>Lockbox Allocation Details</span>
                </h3>

                <div className="min-h-[200px]">
                  {!selectedTransaction ? (
                    <div className="text-center py-8">
                      <FileText className="h-10 w-10 text-slate-300 mx-auto mb-3" />
                      <p className="text-sm text-slate-600">Select a transaction to view allocation details</p>
                    </div>
                  ) : selectedTransaction.allocations.length === 0 ? (
                    <div className="border-2 border-dashed border-orange-300 rounded-lg p-6 bg-orange-50/50">
                      <AlertTriangle className="h-10 w-10 text-orange-500 mx-auto mb-3" />
                      <p className="text-sm font-semibold text-orange-700 text-center">Unallocated Transaction</p>
                      <p className="text-xs text-slate-600 text-center mt-1 mb-4">
                        Amount: {formatCurrency(selectedTransaction.amount)}
                      </p>
                      <div className="space-y-2">
                        <p className="text-xs font-medium text-slate-700">Suggested Actions:</p>
                        <button className="w-full px-3 py-2 bg-orange-600 text-white rounded text-xs hover:bg-orange-700 flex items-center justify-center space-x-2">
                          <Search className="h-3 w-3" />
                          <span>Search Similar Customers</span>
                        </button>
                        <button className="w-full px-3 py-2 bg-slate-600 text-white rounded text-xs hover:bg-slate-700 flex items-center justify-center space-x-2">
                          <FileText className="h-3 w-3" />
                          <span>Manual Allocation</span>
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {selectedTransaction.allocations.map((allocId) => {
                        const alloc = mockAllocations[allocId];
                        if (!alloc) return null;

                        return (
                          <div key={alloc.id} className="border border-green-200 rounded-lg p-4 bg-green-50/30">
                            <div className="flex items-center justify-between mb-3">
                              <span className="px-3 py-1 bg-green-600 text-white rounded-full text-xs font-medium flex items-center space-x-1">
                                <CheckCircle className="h-3 w-3" />
                                <span>Allocated</span>
                              </span>
                              <span className="text-xs text-slate-500">{alloc.allocationType}</span>
                            </div>

                            <div className="space-y-2 text-xs">
                              <div className="grid grid-cols-2 gap-3">
                                <div>
                                  <p className="text-slate-500 mb-1">Customer</p>
                                  <p className="font-semibold text-slate-800">{alloc.customerName}</p>
                                </div>
                                <div>
                                  <p className="text-slate-500 mb-1">Customer ID</p>
                                  <p className="font-semibold text-slate-800">{alloc.customerId}</p>
                                </div>
                              </div>

                              <div className="grid grid-cols-2 gap-3">
                                <div>
                                  <p className="text-slate-500 mb-1">Invoice</p>
                                  <p className="font-semibold text-slate-800">{alloc.invoiceNumber}</p>
                                </div>
                                <div>
                                  <p className="text-slate-500 mb-1">Amount</p>
                                  <p className="font-semibold text-green-600">{formatCurrency(alloc.allocatedAmount)}</p>
                                </div>
                              </div>

                              <div className="pt-2 mt-2 border-t border-green-200">
                                <p className="text-slate-500">Allocated by: {alloc.allocatedBy}</p>
                                <p className="text-slate-500">On: {formatDateTime(alloc.allocatedOn)}</p>
                              </div>
                            </div>

                            <div className="mt-3 flex justify-end gap-2">
                              <button className="px-3 py-1.5 bg-slate-600 text-white rounded-md text-xs font-medium hover:bg-slate-700 transition-colors">
                                Edit
                              </button>
                              <button className="px-3 py-1.5 bg-red-600 text-white rounded-md text-xs font-medium hover:bg-red-700 transition-colors">
                                Remove
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default LockboxPrototype;
