import React, { useState, useMemo, useCallback } from 'react';
import {
  CheckCircle, AlertTriangle, X, Edit, FileText,
  ChevronDown, ChevronRight
} from 'lucide-react';
import {
  useReactTable,
  getCoreRowModel,
  getExpandedRowModel,
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
      // Sort transactions to put "needs_review" items first, then by payment ID for stable positioning
      const sortedTransactions = [...file.transactions].sort((a, b) => {
        const statusOrder = { 'needs_review': 0, 'proposed': 1, 'valid': 2 };
        const aStatus = (a.issues?.length > 0 || a.status === 'needs_review') ? 'needs_review' : (a.status || 'needs_review');
        const bStatus = (b.issues?.length > 0 || b.status === 'needs_review') ? 'needs_review' : (b.status || 'needs_review');

        // Primary sort: status priority
        const statusDiff = (statusOrder[aStatus] || 99) - (statusOrder[bStatus] || 99);
        if (statusDiff !== 0) return statusDiff;

        // Secondary sort: payment ID for stable positioning
        return a.id.localeCompare(b.id);
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
  const [showCorrectionModal, setShowCorrectionModal] = useState(false);
  const [expanded, setExpanded] = useState({});
  const [skippedTransactions, setSkippedTransactions] = useState(new Set());
  const [selectedForEdit, setSelectedForEdit] = useState(new Set());
  const [showMultiEditModal, setShowMultiEditModal] = useState(false);
  const [currentEditIndex, setCurrentEditIndex] = useState(0);

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  // Toggle skip status for a transaction
  const toggleSkipTransaction = useCallback((transactionId) => {
    setSkippedTransactions(prev => {
      const newSet = new Set(prev);
      if (newSet.has(transactionId)) {
        newSet.delete(transactionId);
      } else {
        newSet.add(transactionId);
      }
      return newSet;
    });
  }, []);

  // Toggle selection for editing
  const toggleSelectForEdit = useCallback((transactionId) => {
    setSelectedForEdit(prev => {
      const newSet = new Set(prev);
      if (newSet.has(transactionId)) {
        newSet.delete(transactionId);
      } else {
        newSet.add(transactionId);
      }
      return newSet;
    });
  }, []);

  // Open multi-edit modal
  const openMultiEditModal = () => {
    if (selectedForEdit.size > 0) {
      setCurrentEditIndex(0);
      setShowMultiEditModal(true);
    }
  };

  // Navigate to next transaction in multi-edit
  const goToNext = () => {
    if (currentEditIndex < selectedForEdit.size - 1) {
      setCurrentEditIndex(prev => prev + 1);
    }
  };

  // Navigate to previous transaction in multi-edit
  const goToPrevious = () => {
    if (currentEditIndex > 0) {
      setCurrentEditIndex(prev => prev - 1);
    }
  };

  // Close multi-edit modal
  const closeMultiEditModal = () => {
    setShowMultiEditModal(false);
    setSelectedForEdit(new Set());
    setCurrentEditIndex(0);
  };

  // Select all transactions
  const toggleSelectAll = useCallback(() => {
    // Get all transaction IDs from all files
    const allTransactionIds = files.flatMap(file =>
      file.transactions.map(txn => txn.id)
    );

    if (selectedForEdit.size === allTransactionIds.length) {
      // Deselect all
      setSelectedForEdit(new Set());
    } else {
      // Select all
      setSelectedForEdit(new Set(allTransactionIds));
    }
  }, [files, selectedForEdit.size]);

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
    // 1. NUMBER COLUMN
    columnHelper.display({
      id: 'number',
      header: '#',
      size: 50,
      cell: ({ row }) => {
        const { type, id } = row.original;
        // Only show numbers for transaction rows (top-level payments)
        if (type === 'transaction') {
          // Count only transaction rows up to this point in the data array
          const transactionRows = data.filter(r => r.type === 'transaction');
          const transactionIndex = transactionRows.findIndex(r => r.id === id);
          const rowNumber = transactionIndex + 1;
          
          return (
            <div className="flex justify-center">
              <span className="text-xs text-slate-500 font-medium">{rowNumber}</span>
            </div>
          );
        }
        
        return null;
      }
    }),

    // 2. SELECT COLUMN
    columnHelper.display({
      id: 'select',
      header: 'Select',
      size: 60,
      cell: ({ row }) => {
        const { type, transactionId } = row.original;

        // Only show checkbox for transaction rows
        if (type === 'transaction') {
          const isSelected = selectedForEdit.has(transactionId);
          return (
            <div className="flex justify-center">
              <input
                type="checkbox"
                checked={isSelected}
                onChange={(e) => {
                  e.stopPropagation();
                  toggleSelectForEdit(transactionId);
                }}
                className="rounded border-blue-300 text-blue-600 focus:ring-blue-500"
                title={isSelected ? "Selected for editing" : "Select for editing"}
              />
            </div>
          );
        }

        return null;
      }
    }),

    // 3. TYPE COLUMN
    columnHelper.accessor((row) => {
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
      size: 120,
      enableSorting: false,
      cell: ({ row }) => {
        const { type, level, data: itemData } = row.original;
        const paddingLeft = level * 24 + 8;

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

    // 4. ID COLUMN
    columnHelper.accessor('id', {
      id: 'id',
      header: 'ID',
      size: 180,
      cell: ({ row }) => {
        const { type, data: itemData } = row.original;

        if (type === 'file') {
          return <span className="text-sm font-medium text-slate-800">{itemData.fileName}</span>;
        } else if (type === 'transaction') {
          return <span className="text-sm font-medium text-slate-800">{itemData.id.split('-')[1]}</span>;
        } else if (type === 'invoice') {
          return <span className="text-sm font-medium text-slate-800">{itemData.invoiceNumber}</span>;
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

    // 5. AMOUNT COLUMN
    columnHelper.accessor('amount', {
      id: 'amount',
      header: 'Amount',
      size: 120,
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

    // 6. DESCRIPTION COLUMN (renamed from Account)
    columnHelper.accessor('description', {
      id: 'description',
      header: 'Description',
      size: 200,
      cell: ({ row }) => {
        const { type, data: itemData } = row.original;

        if (type === 'transaction') {
          return <span className="text-xs text-slate-600">{itemData.otherParty}</span>;
        } else if (type === 'invoice') {
          return <span className="text-xs text-slate-600">{itemData.customerName}</span>;
        } else if (type === 'file') {
          return <span className="text-xs text-slate-600">Lockbox file</span>;
        } else if (type === 'lineItem') {
          return <span className="text-xs text-slate-600">{itemData.matchDescription || 'Line item'}</span>;
        }

        return <span className="text-xs text-slate-600">-</span>;
      }
    }),

    // 7. ACTIONS COLUMN (with Skip emoji integrated)
    columnHelper.display({
      id: 'actions',
      header: 'Actions',
      size: 100,
      cell: ({ row }) => {
        const { type, data: itemData, transactionId } = row.original;

        if (type === 'transaction') {
          const isSkipped = skippedTransactions.has(transactionId);

          return (
            <div className="flex items-center justify-center space-x-2">
              {/* Edit button */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedItem({ type: 'transaction', item: itemData, fileId: row.original.fileId, transactionId });
                  setShowCorrectionModal(true);
                }}
                className="p-1 border border-slate-300 text-slate-600 rounded text-xs hover:bg-blue-100 hover:border-blue-300 transition-colors w-6 h-6 flex items-center justify-center"
                title="Edit Allocation"
              >
                ✏️
              </button>

              {/* Skip emoji button */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  toggleSkipTransaction(transactionId);
                }}
                className={`p-1 rounded text-sm transition-all ${
                  isSkipped
                    ? 'bg-red-100 border border-red-300 opacity-100'
                    : 'border border-slate-200 opacity-40 hover:opacity-100 hover:bg-slate-50'
                }`}
                title={isSkipped ? "Will be skipped at posting (click to unskip)" : "Skip at posting"}
              >
                📌
              </button>
            </div>
          );
        }

        // Other row types
        return (
          <div className="flex justify-center">
            {renderActions(type, itemData, row.original.fileId, row.original.transactionId, row.original.invoiceId)}
          </div>
        );
      }
    })
  ], [files, skippedTransactions, toggleSkipTransaction, selectedForEdit, toggleSelectForEdit, data]);

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
              // Clear issues when approving (setting to 'valid')
              const updatedTxn = { ...txn, status: newStatus };
              if (newStatus === 'valid') {
                updatedTxn.issues = [];
              }
              return updatedTxn;
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
        color: 'text-orange-700 bg-orange-50 border border-orange-200 px-2 py-1 rounded-full',
        icon: <AlertTriangle className="h-3 w-3" />,
        label: 'Partially Allocated'
      },
      'valid': {
        color: 'text-blue-700 bg-blue-100 border border-blue-200 px-2 py-1 rounded-full',
        icon: <Edit className="h-3 w-3" />,
        label: 'Allocated'
      },
      'proposed': {
        color: 'text-blue-700 bg-blue-100 border border-blue-200 px-2 py-1 rounded-full',
        icon: <Edit className="h-3 w-3" />,
        label: 'Allocated'
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
      return (
        <div className="flex space-x-1 justify-center">
          <button
            className="p-1 border border-slate-300 text-slate-600 rounded text-xs hover:bg-blue-100 hover:border-blue-300 transition-colors w-6 h-6 flex items-center justify-center"
            title="View File Details"
          >
            📄
          </button>
        </div>
      );
    }

    if (type === 'transaction') {
      return (
        <div className="flex space-x-1 justify-center">
          <button
            onClick={(e) => {
              e.stopPropagation();
              setSelectedItem({ type: 'transaction', item, fileId, transactionId });
              setShowCorrectionModal(true);
            }}
            className="p-1 border border-slate-300 text-slate-600 rounded text-xs hover:bg-blue-100 hover:border-blue-300 transition-colors w-6 h-6 flex items-center justify-center"
            title="Edit Allocation"
          >
            ✏️
          </button>
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

  // Multi-Edit Modal for cycling through selected transactions
  const MultiEditModal = () => {
    if (!showMultiEditModal || selectedForEdit.size === 0) return null;

    // Get array of selected transaction IDs
    const selectedIds = Array.from(selectedForEdit);
    const currentTransactionId = selectedIds[currentEditIndex];

    // Find the current transaction data
    let currentTransaction = null;

    for (const file of files) {
      for (const txn of file.transactions) {
        if (txn.id === currentTransactionId) {
          currentTransaction = txn;
          break;
        }
      }
      if (currentTransaction) break;
    }

    if (!currentTransaction) return null;

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-6 max-w-3xl w-full mx-4 max-h-[90vh] overflow-y-auto">
          {/* Header with progress */}
          <div className="flex items-center justify-between mb-4 pb-4 border-b">
            <div>
              <h3 className="text-lg font-semibold text-slate-800">
                Multi-Edit: Payment Allocations
              </h3>
              <p className="text-sm text-slate-500 mt-1">
                Transaction {currentEditIndex + 1} of {selectedForEdit.size}
              </p>
            </div>
            <button
              onClick={closeMultiEditModal}
              className="text-slate-400 hover:text-slate-600"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Current Transaction Details */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
            <div className="flex items-center justify-between mb-3">
              <h4 className="font-medium text-slate-800">Current Payment</h4>
              <span className="text-xs text-slate-500">ID: {currentTransaction.id.split('-')[1]}</span>
            </div>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-slate-500">Other Party:</p>
                <p className="font-medium text-slate-800">{currentTransaction.otherParty}</p>
              </div>
              <div>
                <p className="text-slate-500">Reference:</p>
                <p className="font-medium text-slate-800">{currentTransaction.reference}</p>
              </div>
              <div>
                <p className="text-slate-500">Total Amount:</p>
                <p className="font-medium text-green-600">{formatCurrency(currentTransaction.amount)}</p>
              </div>
              <div>
                <p className="text-slate-500">Unallocated:</p>
                <p className="font-medium text-orange-600">{formatCurrency(currentTransaction.unallocatedAmount)}</p>
              </div>
            </div>
          </div>

          {/* Allocation Editor */}
          <div className="space-y-4">
            <h4 className="font-medium text-slate-800">Edit Allocations</h4>

            {/* Current Invoices */}
            {currentTransaction.invoices.map((invoice, idx) => (
              <div key={invoice.id} className="border border-slate-200 rounded-lg p-4 bg-slate-50">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-medium text-slate-500">Invoice {idx + 1}</span>
                  <button className="text-xs text-red-600 hover:text-red-700">Remove</button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs text-slate-600 mb-1">Customer/Account</label>
                    <input
                      type="text"
                      defaultValue={invoice.customerName}
                      className="w-full border border-slate-300 rounded px-3 py-2 text-sm"
                      placeholder="Customer name"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-slate-600 mb-1">Invoice Number</label>
                    <input
                      type="text"
                      defaultValue={invoice.invoiceNumber}
                      className="w-full border border-slate-300 rounded px-3 py-2 text-sm"
                      placeholder="Invoice #"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-slate-600 mb-1">Allocated Amount</label>
                    <input
                      type="number"
                      step="0.01"
                      defaultValue={invoice.proposedAmount}
                      className="w-full border border-slate-300 rounded px-3 py-2 text-sm"
                      placeholder="0.00"
                    />
                  </div>
                </div>
              </div>
            ))}

            {/* Add New Allocation */}
            <button className="w-full border-2 border-dashed border-slate-300 rounded-lg p-4 text-sm text-slate-600 hover:border-blue-400 hover:text-blue-600 transition-colors">
              + Add New Invoice Allocation
            </button>

            {/* Quick Actions */}
            <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
              <h5 className="text-xs font-medium text-slate-700 mb-2">Quick Actions</h5>
              <div className="flex space-x-2">
                <button className="px-3 py-1.5 bg-white border border-slate-300 rounded text-xs hover:bg-slate-50">
                  Auto-Match
                </button>
                <button className="px-3 py-1.5 bg-white border border-slate-300 rounded text-xs hover:bg-slate-50">
                  Split Evenly
                </button>
                <button className="px-3 py-1.5 bg-white border border-slate-300 rounded text-xs hover:bg-slate-50">
                  Clear All
                </button>
              </div>
            </div>
          </div>

          {/* Navigation & Actions */}
          <div className="flex items-center justify-between mt-6 pt-4 border-t">
            <div className="flex space-x-2">
              <button
                onClick={goToPrevious}
                disabled={currentEditIndex === 0}
                className={`px-4 py-2 border rounded-md text-sm font-medium transition-colors ${
                  currentEditIndex === 0
                    ? 'border-slate-200 text-slate-400 cursor-not-allowed'
                    : 'border-slate-300 text-slate-700 hover:bg-slate-50'
                }`}
              >
                ← Previous
              </button>
              <button
                onClick={goToNext}
                disabled={currentEditIndex === selectedForEdit.size - 1}
                className={`px-4 py-2 border rounded-md text-sm font-medium transition-colors ${
                  currentEditIndex === selectedForEdit.size - 1
                    ? 'border-slate-200 text-slate-400 cursor-not-allowed'
                    : 'border-slate-300 text-slate-700 hover:bg-slate-50'
                }`}
              >
                Next →
              </button>
            </div>

            <div className="flex space-x-2">
              <button
                onClick={closeMultiEditModal}
                className="px-4 py-2 border border-slate-300 text-slate-700 rounded-md hover:bg-slate-50 text-sm font-medium"
              >
                Cancel
              </button>
              {currentEditIndex < selectedForEdit.size - 1 ? (
                <button
                  onClick={() => {
                    // Save current changes and move to next
                    goToNext();
                  }}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm font-medium"
                >
                  Save & Next →
                </button>
              ) : (
                <button
                  onClick={() => {
                    // Save current changes and close
                    closeMultiEditModal();
                  }}
                  className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 text-sm font-medium"
                >
                  Save & Close
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  };

  // Simple correction modal (placeholder)
  const CorrectionModal = () => {
    if (!selectedItem || !showCorrectionModal) return null;

    const currentTransaction = selectedItem.item;

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-6 max-w-3xl w-full mx-4 max-h-[90vh] overflow-y-auto">
          {/* Header */}
          <div className="flex items-center justify-between mb-4 pb-4 border-b">
            <div>
              <h3 className="text-lg font-semibold text-slate-800">
                Edit Payment Allocation
              </h3>
              <p className="text-sm text-slate-500 mt-1">
                Review and adjust allocation details for this payment.
              </p>
            </div>
            <button
              onClick={() => setShowCorrectionModal(false)}
              className="text-slate-400 hover:text-slate-600"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Current Transaction Details */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
            <div className="flex items-center justify-between mb-3">
              <h4 className="font-medium text-slate-800">Current Payment</h4>
              <span className="text-xs text-slate-500">ID: {currentTransaction.id.split('-')[1]}</span>
            </div>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-slate-500">Other Party:</p>
                <p className="font-medium text-slate-800">{currentTransaction.otherParty}</p>
              </div>
              <div>
                <p className="text-slate-500">Reference:</p>
                <p className="font-medium text-slate-800">{currentTransaction.reference}</p>
              </div>
              <div>
                <p className="text-slate-500">Total Amount:</p>
                <p className="font-medium text-green-600">{formatCurrency(currentTransaction.amount)}</p>
              </div>
              <div>
                <p className="text-slate-500">Unallocated:</p>
                <p className="font-medium text-orange-600">{formatCurrency(currentTransaction.unallocatedAmount)}</p>
              </div>
            </div>
          </div>

          {/* Allocation Editor */}
          <div className="space-y-4">
            <h4 className="font-medium text-slate-800">Edit Allocations</h4>

            {/* Current Invoices */}
            {currentTransaction.invoices.map((invoice, idx) => (
              <div key={invoice.id} className="border border-slate-200 rounded-lg p-4 bg-slate-50">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-medium text-slate-500">Invoice {idx + 1}</span>
                  <button className="text-xs text-red-600 hover:text-red-700">Remove</button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs text-slate-600 mb-1">Customer/Account</label>
                    <input
                      type="text"
                      defaultValue={invoice.customerName}
                      className="w-full border border-slate-300 rounded px-3 py-2 text-sm"
                      placeholder="Customer name"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-slate-600 mb-1">Invoice Number</label>
                    <input
                      type="text"
                      defaultValue={invoice.invoiceNumber}
                      className="w-full border border-slate-300 rounded px-3 py-2 text-sm"
                      placeholder="Invoice #"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-slate-600 mb-1">Allocated Amount</label>
                    <input
                      type="number"
                      step="0.01"
                      defaultValue={invoice.proposedAmount}
                      className="w-full border border-slate-300 rounded px-3 py-2 text-sm"
                      placeholder="0.00"
                    />
                  </div>
                </div>
              </div>
            ))}

            {/* Add New Allocation */}
            <button className="w-full border-2 border-dashed border-slate-300 rounded-lg p-4 text-sm text-slate-600 hover:border-blue-400 hover:text-blue-600 transition-colors">
              + Add New Invoice Allocation
            </button>

            {/* Quick Actions */}
            <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
              <h5 className="text-xs font-medium text-slate-700 mb-2">Quick Actions</h5>
              <div className="flex space-x-2">
                <button className="px-3 py-1.5 bg-white border border-slate-300 rounded text-xs hover:bg-slate-50">
                  Auto-Match
                </button>
                <button className="px-3 py-1.5 bg-white border border-slate-300 rounded text-xs hover:bg-slate-50">
                  Split Evenly
                </button>
                <button className="px-3 py-1.5 bg-white border border-slate-300 rounded text-xs hover:bg-slate-50">
                  Clear All
                </button>
              </div>
            </div>

            {/* Audit Log placeholder */}
            <div className="border border-slate-200 rounded-lg p-4">
              <h4 className="font-medium text-slate-800 mb-2">Audit Log</h4>
              <p className="text-xs text-slate-500 mb-3">
                Audit log entries for this payment will appear here.
              </p>
              <div className="h-20 bg-slate-50 border border-dashed border-slate-200 rounded flex items-center justify-center text-xs text-slate-400">
                No audit entries yet
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end mt-6 pt-4 border-t space-x-2">
            <button
              onClick={() => setShowCorrectionModal(false)}
              className="px-4 py-2 border border-slate-300 text-slate-700 rounded-md hover:bg-slate-50 text-sm font-medium"
            >
              Cancel
            </button>
            <button
              onClick={() => {
                if (selectedItem.type === 'transaction') {
                  updateItemStatus('transaction', selectedItem.fileId, selectedItem.transactionId, null, null, 'valid');
                }
                setShowCorrectionModal(false);
              }}
              className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 text-sm font-medium"
            >
              Save & Close
            </button>
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
            Allocation Review & Edit
          </h1>
          <p className="text-sm text-slate-600 mt-1">
            Review and edit payment allocations. All transactions are editable.
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
              <span className="text-xs text-slate-500 border border-slate-200 px-2 py-1 rounded mb-2 inline-block">Fully Allocated</span>
              <p className="text-lg font-bold text-blue-600">{stats.valid}</p>
            </div>
            <div className="text-center">
              <span className="text-xs text-slate-500 border border-slate-200 px-2 py-1 rounded mb-2 inline-block">Partial/Unallocated</span>
              <p className="text-lg font-bold text-orange-600">{stats.needsReview}</p>
            </div>
          </div>
        </div>

        {/* CONSOLIDATED TABLE */}
        <div className="bg-white border rounded-lg shadow-sm">
          <div className="p-4 border-b">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-slate-800">
                Payment Allocations
              </h3>
              <div className="flex items-center space-x-2">
                {selectedForEdit.size > 0 && (
                  <>
                    <span className="text-xs text-blue-700 bg-blue-50 px-3 py-1.5 rounded-full font-medium border border-blue-200">
                      {selectedForEdit.size} Selected
                    </span>
                    <button
                      onClick={openMultiEditModal}
                      className="px-4 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700 transition-colors flex items-center space-x-2"
                    >
                      <Edit className="h-4 w-4" />
                      <span>Edit Selected ({selectedForEdit.size})</span>
                    </button>
                  </>
                )}
                {skippedTransactions.size > 0 && (
                  <span className="text-xs text-red-700 bg-red-100 px-3 py-1.5 rounded-full font-medium">
                    {skippedTransactions.size} Marked to Skip
                  </span>
                )}
                <span className="text-xs text-blue-600 bg-blue-100 px-3 py-1.5 rounded-full font-medium">
                  All Editable
                </span>
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

                  return allRows.map((row) => {
                    const { type, transactionId } = row.original;
                    const isSkipped = transactionId && skippedTransactions.has(transactionId);
                    const isSelected = transactionId && selectedForEdit.has(transactionId);

                    // Calculate background color based on payment grouping (stable positioning)
                    let backgroundClass;
                    if (isSelected) {
                      backgroundClass = 'bg-blue-100 border-blue-300'; // Selected rows get blue background
                    } else if (isSkipped) {
                      backgroundClass = 'bg-red-50 opacity-60'; // Skipped rows get light red background
                    } else if (type === 'file') {
                      backgroundClass = 'bg-white'; // Files get white background
                    } else {
                      // Use payment ID position for stable alternating colors, regardless of status
                      const transactionIndex = transactionIds.indexOf(transactionId);
                      const isEvenPayment = transactionIndex % 2 === 0;
                      backgroundClass = isEvenPayment ? 'bg-slate-50' : 'bg-white';
                    }

                  return (
                    <tr
                      key={row.id}
                      className={`border-b hover:bg-blue-50 hover:border-blue-200 transition-all duration-300 ${backgroundClass} ${isSkipped ? 'line-through text-slate-400' : ''}`}
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

      </div>

      {/* MODALS */}
      <MultiEditModal />
      <CorrectionModal />
    </div>
  );
};

export default LockboxValidationScreen;