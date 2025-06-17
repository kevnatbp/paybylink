import React, { useState, useEffect } from 'react';
import { Save, Eye, Settings, Download, Plus, MessageSquare, Send, User } from 'lucide-react';

const PaymentLinksWYSIWYGEditor = () => {
  const [activeTab, setActiveTab] = useState('preview');
  const [newComment, setNewComment] = useState('');
  const [comments, setComments] = useState([]);
  const [adHocForm, setAdHocForm] = useState({
    attributionType: 'invoice',
    selectedInvoice: '',
    customAmount: '',
    accountId: '',
    description: '',
    expirationDays: 90
  });
  const [settings, setSettings] = useState({
    autoGenerate: true,
    accountLevelDisable: true,
    adHocEnabled: true,
    attributionTypes: {
      invoice: true,
      openAmount: true,
      accountBalance: true
    },
    allowPartialPayments: true,
    allowOverpayments: true,
    showInvoiceDetails: true,
    enablePdfOptions: true,
    minimumPartialPayment: 25,
    maximumOverpayment: 150,
    linkExpirationDays: 90
  });

  const [paymentAmount, setPaymentAmount] = useState('125.00');
  const [paymentType, setPaymentType] = useState('credit');

  // Load comments from localStorage on mount
  useEffect(() => {
    const savedComments = localStorage.getItem('paymentLinksComments');
    if (savedComments) {
      try {
        setComments(JSON.parse(savedComments));
      } catch (error) {
        console.warn('Failed to load comments:', error);
      }
    }
  }, []);

  // Save comments to localStorage whenever comments change
  useEffect(() => {
    localStorage.setItem('paymentLinksComments', JSON.stringify(comments));
  }, [comments]);

  // Sample data for ad-hoc creation
  const availableInvoices = [
    { id: 'INV-2025-001', amount: '125.00', customer: 'Acme Corp', date: '2025-01-15' },
    { id: 'INV-2025-002', amount: '250.00', customer: 'Beta LLC', date: '2025-01-14' },
    { id: 'INV-2025-003', amount: '75.00', customer: 'Gamma Inc', date: '2025-01-13' }
  ];

  const availableAccounts = [
    { id: 'ACC-001', name: 'Acme Corp', balance: '450.00' },
    { id: 'ACC-002', name: 'Beta LLC', balance: '1250.00' },
    { id: 'ACC-003', name: 'Gamma Inc', balance: '320.00' }
  ];

  // Sample invoice data
  const invoice = {
    id: 'INV-2025-001',
    date: '2025-01-15',
    dueDate: '2025-02-15',
    amount: '125.00',
    description: 'Monthly Service Fee - January 2025',
    status: 'Due',
    merchantName: 'Acme Software Solutions',
    merchantEmail: 'billing@acmesoftware.com',
    merchantPhone: '(555) 123-4567'
  };

  const handleToggle = (key, value) => {
    setSettings(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const handlePayment = () => {
    console.log('Processing payment of:', paymentAmount);
  };

  const handlePreviewInvoice = () => {
    console.log('Opening invoice preview');
  };

  const handleDownloadInvoice = () => {
    console.log('Downloading invoice PDF');
  };

  const handleAttributionChange = (type, enabled) => {
    setSettings(prev => ({
      ...prev,
      attributionTypes: {
        ...prev.attributionTypes,
        [type]: enabled
      }
    }));
  };

  const handleAdHocFormChange = (field, value) => {
    setAdHocForm(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleCreateAdHocLink = () => {
    console.log('Creating ad-hoc payment link:', adHocForm);
    setShowAdHocModal(false);
    setAdHocForm({
      attributionType: 'invoice',
      selectedInvoice: '',
      customAmount: '',
      accountId: '',
      description: '',
      expirationDays: 90
    });
  };

  const getEnabledAttributionTypes = () => {
    return Object.entries(settings.attributionTypes)
      .filter(([key, enabled]) => enabled)
      .map(([key]) => key);
  };

  const handleLogoUpload = (event) => {
    const file = event.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        setSettings(prev => ({
          ...prev,
          customLogo: file,
          logoPreview: e.target.result
        }));
      };
      reader.readAsDataURL(file);
    }
  };

  const removeLogo = () => {
    setSettings(prev => ({
      ...prev,
      customLogo: null,
      logoPreview: null
    }));
  };

  
  const handleAddComment = () => {
    if (newComment.trim()) {
      const comment = {
        id: Date.now(),
        text: newComment,
        author: 'User', // In a real app, this would be the logged-in user
        timestamp: new Date().toLocaleString(),
        tab: activeTab
      };
      setComments(prev => [...prev, comment]);
      setNewComment('');
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleAddComment();
    }
  };

  const ToggleSwitch = ({ enabled, onChange, disabled = false }) => (
    <button
      onClick={() => !disabled && onChange(!enabled)}
      disabled={disabled}
      className={`
        relative inline-flex h-6 w-11 items-center rounded-full transition-colors
        ${enabled ? 'bg-blue-600' : 'bg-gray-200'}
        ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
      `}
    >
      <span
        className={`
          inline-block h-4 w-4 transform rounded-full bg-white transition-transform
          ${enabled ? 'translate-x-6' : 'translate-x-1'}
        `}
      />
    </button>
  );

  const InfoTooltip = ({ text }) => (
    <div className="group relative inline-block ml-2">
      <svg className="h-4 w-4 text-gray-400 cursor-help" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <circle cx="12" cy="12" r="10"/>
        <path d="m9,9 0,0a3,3 0 1,1 6,0c0,2 -3,3 -3,3"/>
        <path d="m12,17 .01,0"/>
      </svg>
      <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-gray-800 text-white text-xs rounded-md opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-10">
        {text}
      </div>
    </div>
  );

  const SidebarNavItem = ({ id, icon: Icon, label, isActive, onClick }) => (
    <button
      onClick={() => onClick(id)}
      className={`
        w-full flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors
        ${isActive 
          ? 'bg-blue-600 text-white' 
          : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
        }
      `}
    >
      <Icon className="h-5 w-5 mr-3" />
      {label}
    </button>
  );

  return (
      <div className="h-screen flex flex-col overflow-hidden bg-gray-100">
        {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-3 flex-shrink-0">
        <div className="flex items-center justify-between">
          <h1 className="text-lg font-semibold text-gray-900">Payment Links Prototype</h1>
          <button className="bg-blue-600 text-white px-3 py-1.5 rounded-md text-sm font-medium hover:bg-blue-700 flex items-center">
            <Save className="h-4 w-4 mr-2" />
            Save
          </button>
        </div>
      </div>

      {/* Main Layout */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Sidebar */}
        <div className="w-80 bg-white border-r border-gray-200 flex-shrink-0 flex flex-col">
          {/* Navigation */}
          <div className="p-4 border-b border-gray-200">
            <nav className="space-y-2">
              <SidebarNavItem
                id="preview"
                icon={Eye}
                label="Preview"
                isActive={activeTab === 'preview'}
                onClick={setActiveTab}
              />
              <SidebarNavItem
                id="adhoc"
                icon={Plus}
                label="Create Link"
                isActive={activeTab === 'adhoc'}
                onClick={setActiveTab}
              />
              <SidebarNavItem
                id="settings"
                icon={Settings}
                label="Settings"
                isActive={activeTab === 'settings'}
                onClick={setActiveTab}
              />
            </nav>
          </div>

          {/* Comments Section */}
          <div className="flex-1 flex flex-col min-h-0">
            {/* Comments Header */}
            <div className="px-4 py-3 border-b border-gray-200 bg-gray-50">
              <div className="flex items-center text-xs font-medium text-gray-600 uppercase tracking-wide">
                <MessageSquare className="h-4 w-4 mr-2" />
                Comments - {activeTab.charAt(0).toUpperCase() + activeTab.slice(1)}
                <span className="ml-2 bg-gray-200 text-gray-700 px-2 py-0.5 rounded-full text-xs">
                  {comments.filter(c => c.tab === activeTab).length}
                </span>
              </div>
            </div>

            {/* Comments List */}
            <div className="flex-1 overflow-y-auto px-4 py-3">
              <div className="space-y-3">
                {comments.filter(comment => comment.tab === activeTab).length === 0 ? (
                  <div className="text-center py-6 text-gray-400">
                    <MessageSquare className="h-6 w-6 mx-auto mb-2 text-gray-300" />
                    <p className="text-xs">No comments for {activeTab}</p>
                  </div>
                ) : (
                  comments
                    .filter(comment => comment.tab === activeTab)
                    .map((comment) => (
                      <div key={comment.id} className="text-xs">
                        <div className="flex items-start space-x-2 p-2 bg-gray-50 rounded border">
                          <div className="flex-shrink-0">
                            <div className="h-6 w-6 bg-blue-100 rounded-full flex items-center justify-center">
                              <User className="h-3 w-3 text-blue-600" />
                            </div>
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center space-x-1 mb-1">
                              <span className="font-medium text-gray-900">{comment.author}</span>
                              <span className="text-gray-400">•</span>
                              <span className="text-gray-500">{comment.timestamp}</span>
                            </div>
                            <p className="text-gray-700 leading-relaxed">{comment.text}</p>
                          </div>
                        </div>
                      </div>
                    ))
                )}
              </div>
            </div>

            {/* Add Comment Form */}
            <div className="px-4 py-3 border-t border-gray-200 bg-gray-50">
              <div className="space-y-2">
                <textarea
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder={`Comment on ${activeTab}...`}
                  rows={2}
                  className="block w-full px-2 py-1.5 text-xs border border-gray-300 rounded shadow-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 resize-none"
                />
                <div className="flex justify-between items-center">
                  <span className="text-xs text-gray-500">Enter to send</span>
                  <button
                    onClick={handleAddComment}
                    disabled={!newComment.trim()}
                    className="flex items-center px-2 py-1 text-xs font-medium text-white bg-blue-600 border border-transparent rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Send className="h-3 w-3 mr-1" />
                    Send
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col overflow-hidden">
          <div className="flex-1 overflow-y-auto">
            <div className="p-6">
              {activeTab === 'preview' && (
                // Preview Mode
                <div className="bg-gray-50 rounded-lg p-6">
                  <div className="bg-white rounded-lg shadow-lg max-w-6xl mx-auto">
                    <div className="grid grid-cols-1 xl:grid-cols-2 gap-8 p-6">
                      {/* Payment Form - Left Side */}
                      <div className="order-2 xl:order-1 bg-gray-50 rounded-lg border border-gray-200">
                        <div className="px-6 py-4 border-b border-gray-200 bg-white rounded-t-lg">
                          <h2 className="text-lg font-semibold text-gray-900">Make a Payment</h2>
                        </div>
                        
                        <div className="p-6 bg-white rounded-b-lg">
                          {/* Payment Amount */}
                          <div className="mb-6">
                            <label className="block text-sm font-medium text-gray-700 mb-2">Payment Amount</label>
                            <div className="flex items-center">
                              <span className="text-sm text-gray-500 mr-2">USD</span>
                              <input
                                type="number"
                                value={paymentAmount}
                                onChange={(e) => setPaymentAmount(e.target.value)}
                                className="block w-40 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-lg font-semibold"
                              />
                            </div>
                            {settings.allowPartialPayments && (
                              <p className="text-xs text-gray-500 mt-1">
                                Minimum payment: ${(parseFloat(invoice.amount) * settings.minimumPartialPayment / 100).toFixed(2)}
                              </p>
                            )}
                            {settings.allowOverpayments && (
                              <p className="text-xs text-gray-500 mt-1">
                                Maximum payment: ${(parseFloat(invoice.amount) * settings.maximumOverpayment / 100).toFixed(2)}
                              </p>
                            )}
                          </div>

                          {/* Payment Method Selection */}
                          <div className="mb-6">
                            <h3 className="text-sm font-medium text-gray-700 mb-3">Payment Method</h3>
                            <div className="flex space-x-4 mb-4">
                              <label className="flex items-center">
                                <input
                                  type="radio"
                                  name="paymentType"
                                  value="credit"
                                  checked={paymentType === 'credit'}
                                  onChange={(e) => setPaymentType(e.target.value)}
                                  className="h-4 w-4 text-blue-600"
                                />
                                <span className="ml-2 text-sm text-gray-700">Credit Card</span>
                              </label>
                              <label className="flex items-center">
                                <input
                                  type="radio"
                                  name="paymentType"
                                  value="debit"
                                  checked={paymentType === 'debit'}
                                  onChange={(e) => setPaymentType(e.target.value)}
                                  className="h-4 w-4 text-blue-600"
                                />
                                <span className="ml-2 text-sm text-gray-700">Direct Debit</span>
                              </label>
                            </div>

                            {/* Payment Form Fields */}
                            <div className="border border-gray-200 rounded-lg p-4 bg-gray-50">
                              <div className="grid grid-cols-1 gap-4">
                                <div>
                                  <label className="block text-sm font-medium text-gray-700 mb-1">
                                    {paymentType === 'credit' ? 'Credit Card Number' : 'Account Number'} <span className="text-red-500">*</span>
                                  </label>
                                  <input
                                    type="text"
                                    placeholder={paymentType === 'credit' ? '4111 1111 1111 1111' : 'Account Number'}
                                    className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                                  />
                                </div>
                                
                                {paymentType === 'credit' ? (
                                  <div className="grid grid-cols-2 gap-4">
                                    <div>
                                      <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Expiration Date <span className="text-red-500">*</span>
                                      </label>
                                      <input
                                        type="text"
                                        placeholder="MM/YYYY"
                                        className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                                      />
                                    </div>
                                    
                                    <div>
                                      <label className="block text-sm font-medium text-gray-700 mb-1">
                                        CVC <span className="text-red-500">*</span>
                                      </label>
                                      <input
                                        type="text"
                                        placeholder="000"
                                        className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                                      />
                                    </div>
                                  </div>
                                ) : (
                                  <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                      Routing Number <span className="text-red-500">*</span>
                                    </label>
                                    <input
                                      type="text"
                                      placeholder="123456789"
                                      className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                                    />
                                  </div>
                                )}
                                
                                <div>
                                  <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Full Name <span className="text-red-500">*</span>
                                  </label>
                                  <input
                                    type="text"
                                    placeholder="Full Name"
                                    className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                                  />
                                </div>
                                
                                <div>
                                  <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                                  <input
                                    type="email"
                                    placeholder="email@example.com"
                                    className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                                  />
                                  <p className="text-xs text-gray-500 mt-1">Optional - for payment confirmation</p>
                                </div>
                              </div>
                            </div>
                          </div>

                          {/* Pay Button */}
                          <button
                            onClick={handlePayment}
                            className="w-full bg-blue-600 text-white py-4 px-4 rounded-md text-lg font-semibold hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
                          >
                            Pay ${paymentAmount}
                          </button>
                          
                          <p className="text-xs text-gray-500 text-center mt-2">
                            Your payment will be processed securely. You will receive a confirmation email after payment.
                          </p>
                        </div>
                      </div>

                      {/* Invoice Details - Right Side */}
                      {settings.showInvoiceDetails && (
                        <div className="order-1 xl:order-2 bg-white rounded-lg border border-gray-200 p-6">
                          <div className="space-y-6">
                            {/* Invoice Details */}
                            <div>
                              <h3 className="text-lg font-semibold text-gray-900 mb-4">Invoice Details</h3>
                              <div className="space-y-3">
                                <div className="flex justify-between">
                                  <span className="text-sm text-gray-600">Invoice Number:</span>
                                  <span className="text-sm font-medium text-gray-900">{invoice.id}</span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-sm text-gray-600">Invoice Date:</span>
                                  <span className="text-sm font-medium text-gray-900">{invoice.date}</span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-sm text-gray-600">Due Date:</span>
                                  <span className="text-sm font-medium text-gray-900">{invoice.dueDate}</span>
                                </div>
                                <div className="flex justify-between items-center pt-3 border-t border-gray-200">
                                  <span className="text-base font-semibold text-gray-900">Total Amount Due:</span>
                                  <span className="text-2xl font-bold text-gray-900">${invoice.amount}</span>
                                </div>
                              </div>
                              
                              {/* Invoice Actions */}
                              {settings.enablePdfOptions && (
                                <div className="flex space-x-3 mt-4">
                                  <button
                                    onClick={handlePreviewInvoice}
                                    className="flex items-center px-3 py-2 text-sm text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50"
                                  >
                                    <Eye className="h-4 w-4 mr-2" />
                                    Preview
                                  </button>
                                  <button
                                    onClick={handleDownloadInvoice}
                                    className="flex items-center px-3 py-2 text-sm text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50"
                                  >
                                    <Download className="h-4 w-4 mr-2" />
                                    Download PDF
                                  </button>
                                </div>
                              )}
                            </div>

                            {/* Invoice Description */}
                            <div>
                              <h4 className="text-sm font-medium text-gray-900 mb-2">Description</h4>
                              <p className="text-sm text-gray-600 bg-gray-50 rounded-lg p-3">{invoice.description}</p>
                            </div>

                            {/* Merchant Information */}
                            <div>
                              <h3 className="text-lg font-semibold text-gray-900 mb-3">Merchant Information</h3>
                              <div className="bg-gray-50 rounded-lg p-4">
                                <div className="space-y-2">
                                  <div>
                                    <span className="text-sm font-medium text-gray-900">{invoice.merchantName}</span>
                                  </div>
                                  <div>
                                    <span className="text-sm text-gray-600">Email: </span>
                                    <a href={`mailto:${invoice.merchantEmail}`} className="text-sm text-blue-600 hover:text-blue-700">
                                      {invoice.merchantEmail}
                                    </a>
                                  </div>
                                  <div>
                                    <span className="text-sm text-gray-600">Phone: </span>
                                    <a href={`tel:${invoice.merchantPhone}`} className="text-sm text-blue-600 hover:text-blue-700">
                                      {invoice.merchantPhone}
                                    </a>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'adhoc' && (
                // Ad-hoc Link Creation Mode
                <div className="max-w-4xl mx-auto">
                  <div className="bg-white rounded-lg border border-gray-200 p-6">
                    <div className="flex items-center justify-between mb-6">
                      <div>
                        <h2 className="text-xl font-semibold text-gray-900">Create Ad-Hoc Payment Link</h2>
                        <p className="text-sm text-gray-600 mt-1">Generate a custom payment link for invoices, open amounts, or account balances</p>
                      </div>
                    </div>

                    {/* Attribution Type Selection */}
                    <div className="mb-6">
                      <label className="block text-sm font-medium text-gray-700 mb-3">Attribution Type</label>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {getEnabledAttributionTypes().includes('invoice') && (
                          <label className={`cursor-pointer rounded-lg border-2 p-4 ${
                            adHocForm.attributionType === 'invoice' ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300'
                          }`}>
                            <input
                              type="radio"
                              name="attributionType"
                              value="invoice"
                              checked={adHocForm.attributionType === 'invoice'}
                              onChange={(e) => handleAdHocFormChange('attributionType', e.target.value)}
                              className="sr-only"
                            />
                            <div className="text-center">
                              <svg className="mx-auto h-8 w-8 text-gray-400 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                              </svg>
                              <h3 className="text-sm font-medium text-gray-900">Invoice</h3>
                              <p className="text-xs text-gray-500 mt-1">Link to specific invoice</p>
                            </div>
                          </label>
                        )}

                        {getEnabledAttributionTypes().includes('openAmount') && (
                          <label className={`cursor-pointer rounded-lg border-2 p-4 ${
                            adHocForm.attributionType === 'openAmount' ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300'
                          }`}>
                            <input
                              type="radio"
                              name="attributionType"
                              value="openAmount"
                              checked={adHocForm.attributionType === 'openAmount'}
                              onChange={(e) => handleAdHocFormChange('attributionType', e.target.value)}
                              className="sr-only"
                            />
                            <div className="text-center">
                              <svg className="mx-auto h-8 w-8 text-gray-400 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                              </svg>
                              <h3 className="text-sm font-medium text-gray-900">Open Amount</h3>
                              <p className="text-xs text-gray-500 mt-1">Custom payment amount</p>
                            </div>
                          </label>
                        )}

                        {getEnabledAttributionTypes().includes('accountBalance') && (
                          <label className={`cursor-pointer rounded-lg border-2 p-4 ${
                            adHocForm.attributionType === 'accountBalance' ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300'
                          }`}>
                            <input
                              type="radio"
                              name="attributionType"
                              value="accountBalance"
                              checked={adHocForm.attributionType === 'accountBalance'}
                              onChange={(e) => handleAdHocFormChange('attributionType', e.target.value)}
                              className="sr-only"
                            />
                            <div className="text-center">
                              <svg className="mx-auto h-8 w-8 text-gray-400 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
                              </svg>
                              <h3 className="text-sm font-medium text-gray-900">Account Balance</h3>
                              <p className="text-xs text-gray-500 mt-1">Total account balance</p>
                            </div>
                          </label>
                        )}
                      </div>
                    </div>

                    {/* Dynamic Form Fields Based on Attribution Type */}
                    <div className="space-y-6">
                      {adHocForm.attributionType === 'invoice' && (
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">Select Invoice</label>
                          <select
                            value={adHocForm.selectedInvoice}
                            onChange={(e) => handleAdHocFormChange('selectedInvoice', e.target.value)}
                            className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                          >
                            <option value="">Choose an invoice...</option>
                            {availableInvoices.map(inv => (
                              <option key={inv.id} value={inv.id}>
                                {inv.id} - {inv.customer} - ${inv.amount} ({inv.date})
                              </option>
                            ))}
                          </select>
                        </div>
                      )}

                      {adHocForm.attributionType === 'openAmount' && (
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">Payment Amount</label>
                          <div className="flex items-center">
                            <span className="text-sm text-gray-500 mr-2">USD</span>
                            <input
                              type="number"
                              value={adHocForm.customAmount}
                              onChange={(e) => handleAdHocFormChange('customAmount', e.target.value)}
                              placeholder="0.00"
                              min="0"
                              step="0.01"
                              className="block w-40 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                            />
                          </div>
                        </div>
                      )}

                      {adHocForm.attributionType === 'accountBalance' && (
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">Select Account</label>
                          <select
                            value={adHocForm.accountId}
                            onChange={(e) => handleAdHocFormChange('accountId', e.target.value)}
                            className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                          >
                            <option value="">Choose an account...</option>
                            {availableAccounts.map(acc => (
                              <option key={acc.id} value={acc.id}>
                                {acc.name} - Current Balance: ${acc.balance}
                              </option>
                            ))}
                          </select>
                        </div>
                      )}

                      {/* Common Fields */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Description (Optional)</label>
                        <textarea
                          value={adHocForm.description}
                          onChange={(e) => handleAdHocFormChange('description', e.target.value)}
                          placeholder="Add a description for this payment link..."
                          rows={3}
                          className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Link Expiration</label>
                        <div className="flex items-center">
                          <input
                            type="number"
                            value={adHocForm.expirationDays}
                            onChange={(e) => handleAdHocFormChange('expirationDays', parseInt(e.target.value))}
                            min="1"
                            max="365"
                            className="block w-20 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                          />
                          <span className="ml-2 text-sm text-gray-500">days</span>
                        </div>
                        <p className="text-xs text-gray-500 mt-1">Payment link will expire after this many days</p>
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex justify-end space-x-3 mt-8 pt-6 border-t border-gray-200">
                      <button
                        onClick={() => setActiveTab('preview')}
                        className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={handleCreateAdHocLink}
                        className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700"
                      >
                        Create Payment Link
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'settings' && (
                // Settings Mode
                <div className="space-y-8 max-w-4xl mx-auto">
                  
                  {/* Auto-Generate Payment Links */}
                  <div className="bg-white rounded-lg border border-gray-200 p-6">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center">
                        <h3 className="text-lg font-medium text-gray-900">Auto-Generate Payment Links</h3>
                        <InfoTooltip text="Automatically create payment links for approved invoices" />
                      </div>
                      <ToggleSwitch 
                        enabled={settings.autoGenerate}
                        onChange={(value) => handleToggle('autoGenerate', value)}
                      />
                    </div>
                    <p className="text-sm text-gray-600 mb-4">
                      When enabled, a payment link will be generated for each approved invoice.
                    </p>
                    
                    {settings.autoGenerate && (
                      <div className="ml-4 pl-4 border-l-2 border-gray-100">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center">
                            <span className="text-sm font-medium text-gray-700">Allow account-level disable</span>
                            <InfoTooltip text="Individual accounts can override this setting" />
                          </div>
                          <ToggleSwitch 
                            enabled={settings.accountLevelDisable}
                            onChange={(value) => handleToggle('accountLevelDisable', value)}
                          />
                        </div>
                        <p className="text-xs text-gray-500 mt-1">Default: Disabled</p>
                      </div>
                    )}
                  </div>

                  {/* Ad-hoc Payment Links */}
                  <div className="bg-white rounded-lg border border-gray-200 p-6">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center">
                        <h3 className="text-lg font-medium text-gray-900">Ad-hoc Payment Links</h3>
                        <InfoTooltip text="Allow manual creation of payment links for various purposes" />
                      </div>
                      <ToggleSwitch 
                        enabled={settings.adHocEnabled}
                        onChange={(value) => handleToggle('adHocEnabled', value)}
                      />
                    </div>
                    <p className="text-sm text-gray-600 mb-4">
                      When enabled, users can create payment links manually with configurable attribution.
                    </p>

                    {settings.adHocEnabled && (
                      <div className="ml-4 pl-4 border-l-2 border-gray-100">
                        <h4 className="text-sm font-medium text-gray-700 mb-3">Attribution Types</h4>
                        <p className="text-xs text-gray-500 mb-3">Select which attribution types are available when creating ad-hoc payment links</p>
                        
                        <div className="space-y-3">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center">
                              <span className="text-sm text-gray-700">Invoice</span>
                              <span className="ml-2 text-xs text-gray-500">(Default)</span>
                            </div>
                            <ToggleSwitch 
                              enabled={settings.attributionTypes.invoice}
                              onChange={(value) => handleAttributionChange('invoice', value)}
                            />
                          </div>
                          
                          <div className="flex items-center justify-between">
                            <span className="text-sm text-gray-700">Open Amount</span>
                            <ToggleSwitch 
                              enabled={settings.attributionTypes.openAmount}
                              onChange={(value) => handleAttributionChange('openAmount', value)}
                            />
                          </div>
                          
                          <div className="flex items-center justify-between">
                            <span className="text-sm text-gray-700">Account Balance</span>
                            <ToggleSwitch 
                              enabled={settings.attributionTypes.accountBalance}
                              onChange={(value) => handleAttributionChange('accountBalance', value)}
                            />
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Payment Options */}
                  <div className="bg-white rounded-lg border border-gray-200 p-6">
                    <h3 className="text-lg font-medium text-gray-900 mb-4">Payment Options</h3>
                    
                    <div className="space-y-6">
                      {/* Partial Payments */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center">
                          <span className="text-sm font-medium text-gray-700">Allow Partial Payments</span>
                          <InfoTooltip text="Customers can pay less than the full amount due" />
                        </div>
                        <ToggleSwitch 
                          enabled={settings.allowPartialPayments}
                          onChange={(value) => handleToggle('allowPartialPayments', value)}
                        />
                      </div>
                      
                      {settings.allowPartialPayments && (
                        <div className="ml-4 pl-4 border-l-2 border-gray-100">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center">
                              <span className="text-sm text-gray-700">Minimum partial payment</span>
                              <InfoTooltip text="Set the minimum percentage that customers can pay" />
                            </div>
                            <div className="flex items-center space-x-2">
                              <input
                                type="number"
                                min="1"
                                max="99"
                                value={settings.minimumPartialPayment}
                                onChange={(e) => handleToggle('minimumPartialPayment', parseInt(e.target.value))}
                                className="w-16 px-2 py-1 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                              />
                              <span className="text-sm text-gray-500">%</span>
                            </div>
                          </div>
                        </div>
                      )}
                      
                      {/* Overpayments */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center">
                          <span className="text-sm font-medium text-gray-700">Allow Overpayments</span>
                          <InfoTooltip text="Customers can pay more than the amount due" />
                        </div>
                        <ToggleSwitch 
                          enabled={settings.allowOverpayments}
                          onChange={(value) => handleToggle('allowOverpayments', value)}
                        />
                      </div>
                      
                      {settings.allowOverpayments && (
                        <div className="ml-4 pl-4 border-l-2 border-gray-100">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center">
                              <span className="text-sm text-gray-700">Maximum overpayment</span>
                              <InfoTooltip text="Set the maximum percentage customers can overpay" />
                            </div>
                            <div className="flex items-center space-x-2">
                              <input
                                type="number"
                                min="101"
                                max="500"
                                value={settings.maximumOverpayment}
                                onChange={(e) => handleToggle('maximumOverpayment', parseInt(e.target.value))}
                                className="w-16 px-2 py-1 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                              />
                              <span className="text-sm text-gray-500">%</span>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Display Options */}
                  <div className="bg-white rounded-lg border border-gray-200 p-6">
                    <h3 className="text-lg font-medium text-gray-900 mb-4">Display Options</h3>
                    
                    <div className="space-y-6">
                      {/* Link Expiration */}
                      <div>
                        <div className="flex items-center mb-3">
                          <span className="text-sm font-medium text-gray-700">Link Expiration</span>
                          <InfoTooltip text="Set how many days payment links remain active before expiring" />
                        </div>
                        <div className="flex items-center">
                          <input
                            type="number"
                            value={settings.linkExpirationDays}
                            onChange={(e) => handleToggle('linkExpirationDays', parseInt(e.target.value) || 90)}
                            min="1"
                            max="365"
                            className="block w-20 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                          />
                          <span className="ml-2 text-sm text-gray-500">days</span>
                        </div>
                        <p className="text-xs text-gray-500 mt-1">Payment links will automatically expire after this period</p>
                      </div>

                      {/* Invoice Details Visibility */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center">
                          <span className="text-sm font-medium text-gray-700">Show Invoice Details</span>
                          <InfoTooltip text="Display invoice information section on payment link pages" />
                        </div>
                        <ToggleSwitch 
                          enabled={settings.showInvoiceDetails}
                          onChange={(value) => handleToggle('showInvoiceDetails', value)}
                        />
                      </div>

                      {/* PDF Options */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center">
                          <span className="text-sm font-medium text-gray-700">Enable PDF Preview & Download</span>
                          <InfoTooltip text="Allow customers to preview and download invoice PDFs" />
                        </div>
                        <ToggleSwitch 
                          enabled={settings.enablePdfOptions}
                          onChange={(value) => handleToggle('enablePdfOptions', value)}
                          disabled={!settings.showInvoiceDetails}
                        />
                      </div>
                      {!settings.showInvoiceDetails && (
                        <p className="text-xs text-gray-500 ml-4">PDF options require invoice details to be shown</p>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PaymentLinksWYSIWYGEditor;