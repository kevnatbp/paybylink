import React, { useState, useEffect } from 'react';
import {
  CheckCircle, AlertTriangle, X, Settings, Edit, FileText,
  ChevronDown, ChevronRight, DollarSign, TrendingUp, AlertCircle, Eye
} from 'lucide-react';
import {
  mockLockboxFiles,
  ruleExplanations,
  issueTypes
} from '../../data/lockboxValidationMockData';

/**
 * LOCKBOX PRE-POST VALIDATION INTERFACE
 *
 * Single consolidated table with hierarchical nesting:
 * Files → Transactions → Invoices → Line Items
 *
 * Shows action status for each level with expand/collapse functionality
 */

const LockboxValidationScreen = () => {
  const [files, setFiles] = useState(mockLockboxFiles);
  const [selectedItem, setSelectedItem] = useState(null);
  const [showRuleDetails, setShowRuleDetails] = useState(false);
  const [showCorrectionModal, setShowCorrectionModal] = useState(false);

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

  // Toggle expand/collapse for any item
  const toggleExpanded = (type, fileId, transactionId = null, invoiceId = null) => {
    setFiles(prevFiles => {
      return prevFiles.map(file => {
        if (file.id !== fileId) return file;

        if (type === 'file') {
          return { ...file, expanded: !file.expanded };
        }

        if (type === 'transaction') {
          return {
            ...file,
            transactions: file.transactions.map(txn =>
              txn.id === transactionId
                ? { ...txn, expanded: !txn.expanded }
                : txn
            )
          };
        }

        if (type === 'invoice') {
          return {
            ...file,
            transactions: file.transactions.map(txn =>
              txn.id === transactionId
                ? {
                    ...txn,
                    invoices: txn.invoices.map(inv =>
                      inv.id === invoiceId
                        ? { ...inv, expanded: !inv.expanded }
                        : inv
                    )
                  }
                : txn
            )
          };
        }

        return file;
      });
    });
  };

  // Update status for any item
  const updateItemStatus = (type, fileId, transactionId, invoiceId, lineItemId, newStatus) => {
    setFiles(prevFiles => {
      return prevFiles.map(file => {
        if (file.id !== fileId) return file;

        return {
          ...file,
          transactions: file.transactions.map(txn => {
            if (txn.id !== transactionId) return txn;

            if (type === 'transaction') {
              return { ...txn, status: newStatus };
            }

            return {
              ...txn,
              invoices: txn.invoices.map(inv => {
                if (inv.id !== invoiceId) return inv;

                if (type === 'invoice') {
                  return { ...inv, status: newStatus };
                }

                return {
                  ...inv,
                  lineItems: inv.lineItems.map(line =>
                    line.id === lineItemId
                      ? { ...line, status: newStatus }
                      : line
                  )
                };
              })
            };
          })
        };
      });
    });
  };

  // Get status display with pastel colored pill styling
  const getStatusDisplay = (status, hasIssues = false) => {
    const displays = {
      'needs_review': {
        color: 'text-slate-700 bg-slate-100 border border-slate-200 px-2 py-1 rounded-full',
        icon: <AlertTriangle className="h-3 w-3" />,
        label: 'Needs Review'
      },
      'valid': {
        color: 'text-green-700 bg-green-100 border border-green-200 px-2 py-1 rounded-full',
        icon: <CheckCircle className="h-3 w-3" />,
        label: 'Valid'
      },
      'proposed': {
        color: 'text-blue-700 bg-blue-100 border border-blue-200 px-2 py-1 rounded-full',
        icon: <Edit className="h-3 w-3" />,
        label: 'Proposed'
      },
      'error': {
        color: 'text-red-700 bg-red-100 border border-red-200 px-2 py-1 rounded-full',
        icon: <X className="h-3 w-3" />,
        label: 'Error'
      }
    };

    const display = displays[status] || displays['proposed'];

    if (hasIssues && status !== 'needs_review') {
      return displays['needs_review'];
    }

    return display;
  };

  // Calculate summary statistics
  const calculateStats = () => {
    let totalFiles = files.length;
    let totalTransactions = 0;
    let totalAmount = 0;
    let needsReview = 0;
    let valid = 0;

    files.forEach(file => {
      file.transactions.forEach(txn => {
        totalTransactions++;
        totalAmount += txn.amount;

        if (txn.status === 'needs_review' || txn.issues.length > 0) {
          needsReview++;
        } else if (txn.status === 'valid') {
          valid++;
        }
      });
    });

    return { totalFiles, totalTransactions, totalAmount, needsReview, valid };
  };

  const stats = calculateStats();

  // Render action buttons for each row type
  const renderActions = (type, item, fileId, transactionId = null, invoiceId = null) => {
    if (type === 'file') return null;


    if (type === 'invoice') {
      return (
        <div className="flex min-w-[140px] justify-center">
          <button
            onClick={(e) => {
              e.stopPropagation();
              setSelectedItem({ type: 'invoice', item, fileId, transactionId, invoiceId });
              setShowCorrectionModal(true);
            }}
            className="px-2 py-1 border border-slate-300 text-slate-600 rounded text-xs hover:bg-yellow-100 hover:border-yellow-300 transition-colors w-16"
          >
            ✏️ Edit
          </button>
        </div>
      );
    }

    return null;
  };

  // Render hierarchical table rows
  const renderTableRows = () => {
    const rows = [];
    let rowIndex = 0;

    files.forEach(file => {
      const fileStatus = getStatusDisplay(file.status);
      const isEvenRow = rowIndex % 2 === 0;

      // File row
      rows.push(
        <tr key={file.id} className={`border-b hover:bg-blue-50 hover:border-blue-200 transition-colors ${isEvenRow ? 'bg-slate-50' : 'bg-white'}`}>
          <td className="p-2">
            <div className="flex items-center space-x-2">
              <button
                onClick={() => toggleExpanded('file', file.id)}
                className="text-slate-500 hover:text-slate-700"
              >
                {file.expanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
              </button>
              <span className="text-xs text-slate-500 border border-slate-200 px-2 py-1 rounded">File</span>
            </div>
          </td>
          <td className="p-2 text-sm text-slate-600">-</td>
          <td className="p-2">
            <div className="flex items-center space-x-2">
              <FileText className="h-4 w-4 text-slate-600" />
              <span className="font-medium text-slate-800">{file.fileName}</span>
            </div>
          </td>
          <td className="p-2 text-sm font-medium text-slate-800">{formatCurrency(file.totalAmount)}</td>
          <td className="p-2">
            <div>
              <span className={`inline-flex items-center space-x-1 text-xs ${fileStatus.color}`}>
                {fileStatus.icon}
                <span>{fileStatus.label}</span>
              </span>
              <div className="text-xs text-slate-500 mt-1">Lockbox file uploaded</div>
            </div>
          </td>
          <td className="p-2"></td>
        </tr>
      );
      rowIndex++;

      // Transaction rows (if file is expanded)
      if (file.expanded) {
        file.transactions.forEach(txn => {
          const txnStatus = getStatusDisplay(txn.status, txn.issues.length > 0);
          const ruleInfo = txn.ruleApplied ? ruleExplanations[txn.ruleApplied]?.name : 'No rule matched';
          const isEvenRow = rowIndex % 2 === 0;

          rows.push(
            <tr key={txn.id} className={`border-b hover:bg-blue-50 hover:border-blue-200 transition-colors ${isEvenRow ? 'bg-slate-50' : 'bg-white'}`}>
              <td className="p-2 pl-8">
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => toggleExpanded('transaction', file.id, txn.id)}
                    className="text-slate-500 hover:text-slate-700"
                  >
                    {txn.expanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                  </button>
                  <span className="text-xs text-slate-500 border border-slate-200 px-2 py-1 rounded">Payment</span>
                </div>
              </td>
              <td className="p-2 text-sm text-slate-600">{txn.otherParty}</td>
              <td className="p-2">
                <span className="font-medium text-slate-800">{txn.id.split('-')[1]}</span>
              </td>
              <td className="p-2 text-sm font-medium text-slate-800">{formatCurrency(txn.amount)}</td>
              <td className="p-2">
                <div>
                  <span className={`inline-flex items-center space-x-1 text-xs ${txnStatus.color}`}>
                    {txnStatus.icon}
                    <span>{txnStatus.label}</span>
                  </span>
                  <div className="text-xs text-slate-500 mt-1">
                    {txn.ruleApplied ? ruleInfo : 'No rules matched'}
                    {txn.issues.length > 0 && ` • ${txn.issues.length} issue(s)`}
                  </div>
                </div>
              </td>
              <td className="p-2">
                {renderActions('transaction', txn, file.id, txn.id)}
              </td>
            </tr>
          );
          rowIndex++;

          // Invoice rows (if transaction is expanded)
          if (txn.expanded) {
            txn.invoices.forEach(invoice => {
              const invStatus = getStatusDisplay(invoice.status);
              const isEvenRow = rowIndex % 2 === 0;

              rows.push(
                <tr key={invoice.id} className={`border-b hover:bg-blue-50 hover:border-blue-200 transition-colors ${isEvenRow ? 'bg-slate-50' : 'bg-white'}`}>
                  <td className="p-2 pl-12">
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => toggleExpanded('invoice', file.id, txn.id, invoice.id)}
                        className="text-slate-500 hover:text-slate-700"
                      >
                        {invoice.expanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                      </button>
                      <span className="text-xs text-slate-500 border border-slate-200 px-2 py-1 rounded">Invoice</span>
                    </div>
                  </td>
                  <td className="p-2 text-sm text-slate-600">{invoice.customerName}</td>
                  <td className="p-2">
                    <div className="flex items-center space-x-2">
                      <FileText className="h-4 w-4 text-green-600" />
                      <span className="font-medium text-slate-800">{invoice.invoiceNumber}</span>
                    </div>
                  </td>
                  <td className="p-2 text-sm font-medium text-slate-800">{formatCurrency(invoice.proposedAmount)}</td>
                  <td className="p-2">
                    <div>
                      <span className={`inline-flex items-center space-x-1 text-xs ${invStatus.color}`}>
                        {invStatus.icon}
                        <span>{invStatus.label}</span>
                      </span>
                      <div className="text-xs text-slate-500 mt-1">Invoice allocation</div>
                    </div>
                  </td>
                  <td className="p-2">
                    {renderActions('invoice', invoice, file.id, txn.id, invoice.id)}
                  </td>
                </tr>
              );
              rowIndex++;

              // Line item rows (if invoice is expanded)
              if (invoice.expanded) {
                invoice.lineItems.forEach(lineItem => {
                  const lineStatus = getStatusDisplay(lineItem.status);
                  const isEvenRow = rowIndex % 2 === 0;

                  rows.push(
                    <tr key={lineItem.id} className={`border-b hover:bg-blue-50 hover:border-blue-200 transition-colors ${isEvenRow ? 'bg-slate-50' : 'bg-white'}`}>
                      <td className="p-2 pl-16">
                        <div className="flex items-center space-x-2">
                          <div className="w-4 h-4"></div>
                          <span className="text-xs text-slate-500 border border-slate-200 px-2 py-1 rounded whitespace-nowrap">Item</span>
                        </div>
                      </td>
                      <td className="p-2 text-sm text-slate-600">-</td>
                      <td className="p-2">
                        <span className="text-sm text-slate-700">{lineItem.description}</span>
                      </td>
                      <td className="p-2 text-sm font-medium text-slate-800">{formatCurrency(lineItem.amount)}</td>
                      <td className="p-2">
                        <div>
                          <span className={`inline-flex items-center space-x-1 text-xs ${lineStatus.color}`}>
                            {lineStatus.icon}
                            <span>{lineStatus.label}</span>
                          </span>
                          <div className="text-xs text-slate-500 mt-1">{lineItem.matchDescription || 'No match description'}</div>
                        </div>
                      </td>
                      <td className="p-2"></td>
                    </tr>
                  );
                  rowIndex++;
                });
              }
            });

            // Unallocated amount row (if exists)
            if (txn.unallocatedAmount > 0) {
              const isEvenRow = rowIndex % 2 === 0;
              rows.push(
                <tr key={`${txn.id}-unallocated`} className={`border-b hover:bg-blue-50 hover:border-blue-200 transition-colors ${isEvenRow ? 'bg-slate-50' : 'bg-white'}`}>
                  <td className="p-2 pl-12">
                    <div className="flex items-center space-x-2">
                      <div className="w-4 h-4"></div>
                      <span className="text-xs text-slate-500 border border-slate-200 px-2 py-1 rounded">Unallocated</span>
                    </div>
                  </td>
                  <td className="p-2 text-sm text-slate-600">-</td>
                  <td className="p-2">
                    <div className="flex items-center space-x-2">
                      <AlertTriangle className="h-4 w-4 text-orange-600" />
                      <span className="font-medium text-orange-800">Unallocated Amount</span>
                    </div>
                  </td>
                  <td className="p-2 text-sm font-medium text-orange-600">{formatCurrency(txn.unallocatedAmount)}</td>
                  <td className="p-2">
                    <div>
                      <span className="inline-flex items-center space-x-1 text-xs text-slate-700">
                        <AlertTriangle className="h-3 w-3" />
                        <span>Needs Review</span>
                      </span>
                      <div className="text-xs text-slate-500 mt-1">Manual assignment needed</div>
                    </div>
                  </td>
                  <td className="p-2">
                    <div className="flex min-w-[140px] justify-center">
                      <button
                        onClick={() => {
                          setSelectedItem({ type: 'unallocated', item: txn, fileId: file.id, transactionId: txn.id });
                          setShowCorrectionModal(true);
                        }}
                        className="px-2 py-1 border border-slate-300 text-slate-600 rounded text-xs hover:bg-yellow-100 hover:border-yellow-300 transition-colors w-16"
                      >
                        ✏️ Edit
                      </button>
                    </div>
                  </td>
                </tr>
              );
              rowIndex++;
            }
          }
        });
      }
    });

    return rows;
  };

  // Calculate if ready to post
  const canPost = files.every(file =>
    file.transactions.every(txn =>
      txn.status === 'valid' &&
      txn.issues.length === 0 &&
      txn.unallocatedAmount === 0
    )
  );

  // Simple correction modal (placeholder)
  const CorrectionModal = () => {
    if (!selectedItem || !showCorrectionModal) return null;

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-slate-800">
              {selectedItem.type === 'transaction' ? 'Review Payment' :
               selectedItem.type === 'invoice' ? 'Edit Invoice Allocation' : 'Allocate Remaining Amount'}
            </h3>
            <button
              onClick={() => setShowCorrectionModal(false)}
              className="text-slate-400 hover:text-slate-600"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="space-y-4">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h4 className="font-medium text-slate-800 mb-2">Item Details:</h4>
              <div className="text-sm text-slate-600">
                {selectedItem.type === 'transaction' && (
                  <div>
                    <p>Amount: {formatCurrency(selectedItem.item.amount)}</p>
                    <p>Reference: {selectedItem.item.reference}</p>
                    <p>Issues: {selectedItem.item.issues.map(issue => issueTypes[issue]?.label).join(', ')}</p>
                  </div>
                )}
                {selectedItem.type === 'invoice' && (
                  <div>
                    <p>Invoice: {selectedItem.item.invoiceNumber}</p>
                    <p>Proposed Amount: {formatCurrency(selectedItem.item.proposedAmount)}</p>
                    <p>Customer: {selectedItem.item.customerName}</p>
                  </div>
                )}
                {selectedItem.type === 'unallocated' && (
                  <div>
                    <p>Unallocated: {formatCurrency(selectedItem.item.unallocatedAmount)}</p>
                    <p>From Payment: {formatCurrency(selectedItem.item.amount)}</p>
                  </div>
                )}
              </div>
            </div>

            <div className="border-2 border-dashed border-slate-300 rounded-lg p-8 text-center">
              <FileText className="h-12 w-12 text-slate-300 mx-auto mb-3" />
              <p className="text-slate-500 mb-2">Allocation Interface</p>
              <p className="text-xs text-slate-400">
                Full correction interface would be implemented here
              </p>
            </div>

            <div className="flex space-x-3 pt-4 border-t">
              <button
                onClick={() => {
                  // Update status based on type
                  if (selectedItem.type === 'transaction') {
                    updateItemStatus('transaction', selectedItem.fileId, selectedItem.transactionId, null, null, 'valid');
                  }
                  setShowCorrectionModal(false);
                }}
                className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
              >
                Save
              </button>
              <button
                onClick={() => setShowCorrectionModal(false)}
                className="px-4 py-2 border border-slate-300 text-slate-700 rounded hover:bg-slate-50"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="w-full bg-slate-50 min-h-screen">
      {/* HEADER */}
      <div className="border-b bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <h1 className="text-xl font-semibold text-slate-800">
            Lockbox Pre-Post Validation
          </h1>
          <p className="text-sm text-slate-600 mt-1">
            Hierarchical view: Files → Transactions → Invoices → Line Items
          </p>
        </div>
      </div>

      {/* MAIN CONTENT */}
      <div className="max-w-7xl mx-auto px-6 py-6 space-y-6">

        {/* SUMMARY STATS - COMMENTED OUT FOR NOW */}
        {/*
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white border rounded-lg shadow-sm p-4">
            <div className="flex items-center space-x-3">
              <FileText className="h-8 w-8 text-slate-500" />
              <div>
                <p className="text-xs text-slate-500 uppercase tracking-wide">Files</p>
                <p className="text-2xl font-bold text-slate-800">{stats.totalFiles}</p>
              </div>
            </div>
          </div>

          <div className="bg-white border rounded-lg shadow-sm p-4">
            <div className="flex items-center space-x-3">
              <DollarSign className="h-8 w-8 text-blue-500" />
              <div>
                <p className="text-xs text-slate-500 uppercase tracking-wide">Transactions</p>
                <p className="text-2xl font-bold text-slate-800">{stats.totalTransactions}</p>
                <p className="text-xs text-slate-400">{formatCurrency(stats.totalAmount)}</p>
              </div>
            </div>
          </div>

          <div className="bg-white border rounded-lg shadow-sm p-4">
            <div className="flex items-center space-x-3">
              <CheckCircle className="h-8 w-8 text-green-500" />
              <div>
                <p className="text-xs text-slate-500 uppercase tracking-wide">Valid</p>
                <p className="text-2xl font-bold text-green-600">{stats.valid}</p>
                <p className="text-xs text-slate-400">Ready to post</p>
              </div>
            </div>
          </div>

          <div className="bg-white border rounded-lg shadow-sm p-4">
            <div className="flex items-center space-x-3">
              <AlertTriangle className="h-8 w-8 text-orange-500" />
              <div>
                <p className="text-xs text-slate-500 uppercase tracking-wide">Needs Review</p>
                <p className="text-2xl font-bold text-orange-600">{stats.needsReview}</p>
                <p className="text-xs text-slate-400">Requires attention</p>
              </div>
            </div>
          </div>
        </div>
        */}

        {/* CONSOLIDATED TABLE */}
        <div className="bg-white border rounded-lg shadow-sm">
          <div className="p-4 border-b">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-slate-800">
                Allocation Review
              </h3>
              <div className="flex space-x-3">
                <button
                  disabled={!canPost}
                  className={`px-4 py-2 rounded text-sm font-medium transition-colors ${
                    canPost
                      ? 'bg-slate-700 text-white hover:bg-slate-800'
                      : 'bg-slate-300 text-slate-500'
                  }`}
                >
                  {canPost ? `✓ Post All Valid (${stats.valid})` : '⚠️ Resolve Issues to Post'}
                </button>
              </div>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50 border-b">
                <tr>
                  <th className="text-left p-2 font-medium text-slate-700 w-[10%]">Type</th>
                  <th className="text-left p-2 font-medium text-slate-700 w-[17%]">Account</th>
                  <th className="text-left p-2 font-medium text-slate-700 w-[23%]">ID</th>
                  <th className="text-left p-2 font-medium text-slate-700 w-[12%]">Amount</th>
                  <th className="text-left p-2 font-medium text-slate-700 w-[23%]">Status</th>
                  <th className="text-center p-2 font-medium text-slate-700 w-[15%]">Action</th>
                </tr>
              </thead>
              <tbody>
                {renderTableRows()}
              </tbody>
            </table>
          </div>
        </div>

        {/* POSTING CONTROL */}
        <div className="bg-white border rounded-lg shadow-sm p-6">
          <h3 className="text-lg font-semibold text-slate-800 mb-4">Posting Status</h3>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div>
              <h4 className="font-medium text-slate-800 mb-3">Summary</h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-slate-600">✓ Valid:</span>
                  <span className="font-medium text-green-600">{stats.valid} transactions</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">⚠ Needs Review:</span>
                  <span className="font-medium text-orange-600">{stats.needsReview} transactions</span>
                </div>
              </div>
            </div>

            <div>
              <h4 className="font-medium text-slate-800 mb-3">Requirements</h4>
              {!canPost ? (
                <div className="text-sm text-orange-600 mb-4">
                  ⚠ Cannot post until all transactions are valid with no unallocated amounts
                </div>
              ) : (
                <div className="text-sm text-green-600 mb-4">
                  ✓ All requirements met. Ready to post.
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* MODALS */}
      <CorrectionModal />
    </div>
  );
};

export default LockboxValidationScreen;