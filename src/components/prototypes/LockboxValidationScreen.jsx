import React, { useState, useEffect, useMemo } from 'react';
import {
  CheckCircle, AlertTriangle, X, Settings, Edit, FileText,
  ChevronDown, ChevronRight, DollarSign, TrendingUp, AlertCircle, Eye
} from 'lucide-react';
import {
  useReactTable,
  getCoreRowModel,
  getExpandedRowModel,
  getSortedRowModel,
  flexRender,
  createColumnHelper
} from '@tanstack/react-table';
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

// Helper to flatten hierarchical data for TanStack Table
const flattenData = (files) => {
  const flattened = [];

  files.forEach(file => {
    // Add file row
    flattened.push({
      id: file.id,
      type: 'file',
      level: 0,
      data: file,
      parentId: null,
      fileId: file.id,
      transactionId: null,
      invoiceId: null
    });

    if (file.expanded) {
      // Sort transactions to put "needs_review" items first
      const sortedTransactions = [...file.transactions].sort((a, b) => {
        const statusOrder = { 'needs_review': 0, 'proposed': 1, 'valid': 2 };
        const aStatus = (a.issues?.length > 0 || a.status === 'needs_review') ? 'needs_review' : (a.status || 'needs_review');
        const bStatus = (b.issues?.length > 0 || b.status === 'needs_review') ? 'needs_review' : (b.status || 'needs_review');
        return (statusOrder[aStatus] || 99) - (statusOrder[bStatus] || 99);
      });

      sortedTransactions.forEach(txn => {
        // Add transaction row
        flattened.push({
          id: txn.id,
          type: 'transaction',
          level: 1,
          data: txn,
          parentId: file.id,
          fileId: file.id,
          transactionId: txn.id,
          invoiceId: null
        });

        if (txn.expanded) {
          txn.invoices.forEach(invoice => {
            // Add invoice row
            flattened.push({
              id: invoice.id,
              type: 'invoice',
              level: 2,
              data: invoice,
              parentId: txn.id,
              fileId: file.id,
              transactionId: txn.id,
              invoiceId: invoice.id
            });

            if (invoice.expanded) {
              invoice.lineItems.forEach(lineItem => {
                // Add line item row
                flattened.push({
                  id: lineItem.id,
                  type: 'lineItem',
                  level: 3,
                  data: lineItem,
                  parentId: invoice.id,
                  fileId: file.id,
                  transactionId: txn.id,
                  invoiceId: invoice.id
                });
              });
            }
          });

          // Add unallocated row if exists
          if (txn.unallocatedAmount > 0) {
            flattened.push({
              id: `${txn.id}-unallocated`,
              type: 'unallocated',
              level: 2,
              data: { ...txn, unallocatedAmount: txn.unallocatedAmount },
              parentId: txn.id,
              fileId: file.id,
              transactionId: txn.id,
              invoiceId: null
            });
          }
        }
      });
    }
  });

  return flattened;
};

const columnHelper = createColumnHelper();

const LockboxValidationScreen = () => {
  const [files, setFiles] = useState(mockLockboxFiles);
  const [selectedItem, setSelectedItem] = useState(null);
  const [showRuleDetails, setShowRuleDetails] = useState(false);
  const [showCorrectionModal, setShowCorrectionModal] = useState(false);
  const [expanded, setExpanded] = useState({});

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

  // Prepare flattened data for TanStack Table
  const data = useMemo(() => flattenData(files), [files]);

  // Define columns for TanStack Table
  const columns = useMemo(() => [
    columnHelper.accessor((row) => {
      // Custom sort order to maintain hierarchy: File (0) → Payment (1) → Invoice (2) → Item (3) → Unallocated (2)
      const typeSortOrder = {
        'file': 0,
        'transaction': 1,
        'invoice': 2,
        'unallocated': 2,
        'lineItem': 3
      };
      return typeSortOrder[row.type] || 999;
    }, {
      id: 'type',
      header: 'Type',
      size: 80,
      enableSorting: false,
      cell: ({ row }) => {
        const { type, level, data: itemData } = row.original;

        // Calculate padding based on hierarchy level
        const paddingLeft = level * 24 + 8; // 24px per level + 8px base padding

        const typeLabels = {
          file: 'File',
          transaction: 'Payment',
          invoice: 'Invoice',
          lineItem: 'Item',
          unallocated: 'Unallocated'
        };

        const canExpand = (type === 'file' && itemData.transactions?.length > 0) ||
                         (type === 'transaction' && itemData.invoices?.length > 0) ||
                         (type === 'invoice' && itemData.lineItems?.length > 0);

        return (
          <div className="flex items-center space-x-2" style={{ paddingLeft: `${paddingLeft}px` }}>
            {canExpand ? (
              <button
                onClick={() => {
                  if (type === 'file') {
                    toggleExpanded('file', itemData.id);
                  } else if (type === 'transaction') {
                    toggleExpanded('transaction', row.original.fileId, itemData.id);
                  } else if (type === 'invoice') {
                    toggleExpanded('invoice', row.original.fileId, row.original.transactionId, itemData.id);
                  }
                }}
                className="text-slate-500 hover:text-slate-700"
              >
                {row.getIsExpanded() ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
              </button>
            ) : (
              <div className="w-4 h-4"></div>
            )}
            <span className="text-xs text-slate-500 border border-slate-200 px-2 py-1 rounded whitespace-nowrap">
              {typeLabels[type] || type}
            </span>
          </div>
        );
      }
    }),

    columnHelper.accessor((row) => {
      const { type, data: itemData } = row;

      // Define sort priority: lower numbers appear first
      const statusSortOrder = {
        'needs_review': 0,     // Highest priority - needs attention first
        'Not Posted': 1,       // Files that need posting
        'proposed': 2,         // Proposed allocations
        'valid': 3            // Valid items last
      };

      let statusKey;
      if (type === 'file') {
        statusKey = 'Not Posted';
      } else {
        const status = itemData.status || 'needs_review';
        const hasIssues = itemData.issues?.length > 0;
        if (hasIssues && status !== 'needs_review') {
          statusKey = 'needs_review';
        } else {
          statusKey = status;
        }
      }

      return statusSortOrder[statusKey] ?? 999;
    }, {
      id: 'status',
      header: 'Allocation Status',
      size: 128,
      enableSorting: false,
      cell: ({ row }) => {
        const { type, data: itemData } = row.original;

        if (type === 'file') {
          return (
            <span className="inline-flex items-center space-x-1 text-xs text-orange-700 bg-orange-100 border border-orange-200 px-2 py-1 rounded-full">
              <AlertTriangle className="h-3 w-3" />
              <span>Not Posted</span>
            </span>
          );
        }

        const status = itemData.status || 'needs_review';
        const hasIssues = itemData.issues?.length > 0;
        const statusDisplay = getStatusDisplay(status, hasIssues);

        return (
          <span className={`inline-flex items-center space-x-1 text-xs ${statusDisplay.color}`}>
            {statusDisplay.icon}
            <span>{statusDisplay.label}</span>
          </span>
        );
      }
    }),

    columnHelper.accessor('rule', {
      id: 'rule',
      header: 'Rule/Match',
      size: 128,
      cell: ({ row }) => {
        const { type, data: itemData } = row.original;

        if (type === 'file') {
          return <span className="text-xs text-slate-500">Lockbox file uploaded</span>;
        } else if (type === 'transaction') {
          const ruleInfo = itemData.ruleApplied ? ruleExplanations[itemData.ruleApplied]?.name : 'No rules matched';
          return <span className="text-xs text-slate-500">{ruleInfo}</span>;
        } else if (type === 'invoice') {
          return <span className="text-xs text-slate-500">Invoice allocation</span>;
        } else if (type === 'lineItem') {
          return <span className="text-xs text-slate-500">{itemData.matchDescription || 'No match description'}</span>;
        } else if (type === 'unallocated') {
          return <span className="text-xs text-slate-500">Manual assignment needed</span>;
        }

        return null;
      }
    }),

    columnHelper.accessor('account', {
      id: 'account',
      header: 'Account',
      size: 144,
      cell: ({ row }) => {
        const { type, data: itemData } = row.original;

        if (type === 'transaction') {
          return <span className="text-xs text-slate-600">{itemData.otherParty}</span>;
        } else if (type === 'invoice') {
          return <span className="text-xs text-slate-600">{itemData.customerName}</span>;
        } else if (type === 'file') {
          return <span className="text-xs text-slate-600">-</span>;
        }

        return <span className="text-xs text-slate-600">-</span>;
      }
    }),

    columnHelper.accessor('id', {
      id: 'id',
      header: 'ID',
      size: 144,
      cell: ({ row }) => {
        const { type, data: itemData } = row.original;

        if (type === 'file') {
          return (
            <div className="flex items-center space-x-2">
              <FileText className="h-4 w-4 text-slate-600" />
              <span className="text-sm font-medium text-slate-800">{itemData.fileName}</span>
            </div>
          );
        } else if (type === 'transaction') {
          return <span className="text-sm font-medium text-slate-800">{itemData.id.split('-')[1]}</span>;
        } else if (type === 'invoice') {
          return (
            <div className="flex items-center space-x-2">
              <FileText className="h-4 w-4 text-green-600" />
              <span className="text-sm font-medium text-slate-800">{itemData.invoiceNumber}</span>
            </div>
          );
        } else if (type === 'lineItem') {
          return <span className="text-sm text-slate-700">{itemData.description}</span>;
        } else if (type === 'unallocated') {
          return (
            <div className="flex items-center space-x-2">
              <AlertTriangle className="h-4 w-4 text-orange-600" />
              <span className="text-sm font-medium text-orange-800">Unallocated Amount</span>
            </div>
          );
        }

        return null;
      }
    }),

    columnHelper.accessor('amount', {
      id: 'amount',
      header: 'Amount',
      size: 112,
      cell: ({ row }) => {
        const { type, data: itemData } = row.original;

        let amount = 0;
        let colorClass = 'text-slate-800';

        if (type === 'file') {
          amount = itemData.totalAmount;
        } else if (type === 'transaction') {
          amount = itemData.amount;
        } else if (type === 'invoice') {
          amount = itemData.proposedAmount;
        } else if (type === 'lineItem') {
          amount = itemData.amount;
        } else if (type === 'unallocated') {
          amount = itemData.unallocatedAmount;
          colorClass = 'text-orange-600';
        }

        return <span className={`text-sm font-medium ${colorClass}`}>{formatCurrency(amount)}</span>;
      }
    }),

    columnHelper.display({
      id: 'actions',
      header: 'Action',
      size: 64,
      cell: ({ row }) => {
        const { type, data: itemData } = row.original;

        return (
          <div className="flex justify-center">
            {renderActions(type, itemData, row.original.fileId, row.original.transactionId, row.original.invoiceId)}
          </div>
        );
      }
    })
  ], [files]);

  // Create TanStack Table instance
  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getExpandedRowModel: getExpandedRowModel(),
    enableSorting: false,
    enableExpanding: true,
    getRowCanExpand: (row) => {
      const { type, data: itemData } = row.original;
      return (type === 'file' && itemData.transactions?.length > 0) ||
             (type === 'transaction' && itemData.invoices?.length > 0) ||
             (type === 'invoice' && itemData.lineItems?.length > 0);
    },
    state: {
      expanded
    },
    onExpandedChange: setExpanded
  });

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
        color: 'text-red-700 bg-red-50 border border-red-200 px-2 py-1 rounded-full',
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
    if (type === 'file') {
      // Check if all transactions in this file are valid with no issues
      const canPost = item.transactions.every(txn =>
        txn.status === 'valid' &&
        txn.issues.length === 0 &&
        txn.unallocatedAmount === 0
      );

      return (
        <div className="flex space-x-1 justify-center">
          <button
            disabled={!canPost}
            className={`p-1 border rounded text-xs transition-colors w-6 h-6 flex items-center justify-center ${
              canPost
                ? 'border-slate-300 text-slate-600 hover:bg-green-100 hover:border-green-300'
                : 'border-slate-200 text-slate-400 cursor-not-allowed bg-slate-50'
            }`}
            title={canPost ? "Post File" : "Resolve all issues to post"}
          >
            📮
          </button>
        </div>
      );
    }

    if (type === 'transaction') {
      const needsReview = item.status === 'needs_review' || item.issues.length > 0;

      return (
        <div className="flex space-x-1 justify-center">
          {needsReview ? (
            <button
              onClick={(e) => {
                e.stopPropagation();
                setSelectedItem({ type: 'transaction', item, fileId, transactionId });
                setShowCorrectionModal(true);
              }}
              className="p-1 border border-slate-300 text-slate-600 rounded text-xs hover:bg-blue-100 hover:border-blue-300 transition-colors w-6 h-6 flex items-center justify-center"
              title="Review"
            >
              🔍
            </button>
          ) : (
            <button
              onClick={(e) => {
                e.stopPropagation();
                updateItemStatus('transaction', fileId, transactionId, null, null, 'approved');
              }}
              className="p-1 border border-slate-300 text-slate-600 rounded text-xs hover:bg-green-100 hover:border-green-300 transition-colors w-6 h-6 flex items-center justify-center"
              title="Approve"
            >
              ✓
            </button>
          )}
        </div>
      );
    }

    if (type === 'invoice') {
      return (
        <div className="flex space-x-1 justify-center">
          <button
            onClick={(e) => {
              e.stopPropagation();
              setSelectedItem({ type: 'invoice', item, fileId, transactionId, invoiceId });
              setShowCorrectionModal(true);
            }}
            className="p-1 border border-slate-300 text-slate-600 rounded text-xs hover:bg-yellow-100 hover:border-yellow-300 transition-colors w-6 h-6 flex items-center justify-center"
            title="Edit"
          >
            ✏️
          </button>
        </div>
      );
    }

    return null;
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

        {/* SUMMARY STATS */}
        <div className="bg-white border rounded-lg shadow-sm p-4">
          <div className="grid grid-cols-5 gap-6">
            <div className="text-center">
              <span className="text-xs text-slate-500 border border-slate-200 px-2 py-1 rounded mb-2 inline-block">Files</span>
              <p className="text-lg font-bold text-slate-800">{stats.totalFiles}</p>
            </div>
            <div className="text-center">
              <span className="text-xs text-slate-500 border border-slate-200 px-2 py-1 rounded mb-2 inline-block">Payments</span>
              <p className="text-lg font-bold text-slate-800">{stats.totalTransactions}</p>
            </div>
            <div className="text-center">
              <span className="text-xs text-slate-500 border border-slate-200 px-2 py-1 rounded mb-2 inline-block">Total Volume</span>
              <p className="text-lg font-bold text-blue-600">{formatCurrency(stats.totalAmount)}</p>
            </div>
            <div className="text-center">
              <span className="text-xs text-slate-500 border border-slate-200 px-2 py-1 rounded mb-2 inline-block">Matched</span>
              <p className="text-lg font-bold text-green-600">{stats.valid}</p>
            </div>
            <div className="text-center">
              <span className="text-xs text-slate-500 border border-slate-200 px-2 py-1 rounded mb-2 inline-block">Review Required</span>
              <p className="text-lg font-bold text-orange-600">{stats.needsReview}</p>
            </div>
          </div>
        </div>

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

          <div className="p-4">
            <div className="border border-slate-200 rounded-lg overflow-hidden">
              <table className="w-full">
                <thead className="bg-slate-50 border-b border-slate-200">
                  {table.getHeaderGroups().map(headerGroup => (
                    <tr key={headerGroup.id}>
                      {headerGroup.headers.map((header, index, array) => (
                        <th
                          key={header.id}
                          className={`text-left p-2 font-medium text-slate-700 ${
                            index < array.length - 1 ? 'border-r border-slate-200' : ''
                          }`}
                          style={{ width: `${header.getSize()}px` }}
                        >
                          {header.isPlaceholder
                            ? null
                            : flexRender(header.column.columnDef.header, header.getContext())
                          }
                        </th>
                      ))}
                    </tr>
                  ))}
                </thead>
              <tbody>
                {(() => {
                  // Pre-calculate transaction groupings for efficient row coloring
                  const allRows = table.getRowModel().rows;
                  const transactionIds = [...new Set(allRows.map(r => r.original.transactionId).filter(Boolean))];

                  return allRows.map((row, index) => {
                    const { type, transactionId } = row.original;

                    // Calculate background color based on payment grouping
                    let backgroundClass;
                    if (type === 'file') {
                      backgroundClass = 'bg-white'; // Files get white background
                    } else {
                      const transactionIndex = transactionIds.indexOf(transactionId);
                      const isEvenPayment = transactionIndex % 2 === 0;
                      backgroundClass = isEvenPayment ? 'bg-slate-50' : 'bg-white';
                    }

                  return (
                    <tr
                      key={row.id}
                      className={`border-b hover:bg-blue-50 hover:border-blue-200 transition-colors ${backgroundClass}`}
                    >
                      {row.getVisibleCells().map((cell, index, array) => (
                        <td
                          key={cell.id}
                          className={`p-2 ${
                            index < array.length - 1 ? 'border-r border-slate-200' : ''
                          }`}
                          style={{ width: `${cell.column.getSize()}px` }}
                        >
                          {flexRender(cell.column.columnDef.cell, cell.getContext())}
                        </td>
                      ))}
                    </tr>
                    );
                  });
                })()}
              </tbody>
              </table>
            </div>
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