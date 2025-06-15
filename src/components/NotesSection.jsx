import React, { useState, useEffect } from 'react';
import { MessageSquare, CheckCircle, XCircle } from 'lucide-react';

const STORAGE_KEY = 'paybylink-comments';

const NotesSection = () => {
  const [comments, setComments] = useState(() => {
    // Load comments from localStorage on initial render
    const savedComments = localStorage.getItem(STORAGE_KEY);
    return savedComments ? JSON.parse(savedComments) : [];
  });
  const [newComment, setNewComment] = useState('');
  const [newAuthor, setNewAuthor] = useState('');

  // Save comments to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(comments));
  }, [comments]);

  const handleAddComment = (e) => {
    e.preventDefault();
    if (!newComment.trim() || !newAuthor.trim()) return;

    const comment = {
      id: Date.now(),
      author: newAuthor,
      text: newComment,
      timestamp: new Date().toLocaleString(),
      status: 'pending',
      feedback: ''
    };

    setComments([...comments, comment]);
    setNewComment('');
    setNewAuthor('');
  };

  const handleStatusChange = (commentId, newStatus) => {
    setComments(comments.map(comment => 
      comment.id === commentId 
        ? { ...comment, status: newStatus }
        : comment
    ));
  };

  const handleAddFeedback = (commentId, feedback) => {
    setComments(comments.map(comment =>
      comment.id === commentId
        ? { ...comment, feedback }
        : comment
    ));
  };

  const handleDeleteComment = (commentId) => {
    setComments(comments.filter(comment => comment.id !== commentId));
  };

  return (
    <div className="bg-white rounded-lg shadow-lg p-6 mt-8">
      <h2 className="text-2xl font-bold mb-6 flex items-center">
        <MessageSquare className="mr-2" />
        Notes & Comments
      </h2>

      {/* Add Comment Form */}
      <form onSubmit={handleAddComment} className="mb-8">
        <div className="mb-4">
          <label htmlFor="author" className="block text-sm font-medium text-gray-700 mb-1">
            Your Name
          </label>
          <input
            type="text"
            id="author"
            value={newAuthor}
            onChange={(e) => setNewAuthor(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Enter your name"
            required
          />
        </div>
        <div className="mb-4">
          <label htmlFor="comment" className="block text-sm font-medium text-gray-700 mb-1">
            Comment
          </label>
          <textarea
            id="comment"
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            rows="3"
            placeholder="Enter your comment"
            required
          />
        </div>
        <button
          type="submit"
          className="bg-blue-500 text-white px-4 py-2 rounded-md hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          Add Comment
        </button>
      </form>

      {/* Comments List */}
      <div className="space-y-4">
        {comments.length === 0 ? (
          <p className="text-gray-500 text-center py-4">No comments yet. Be the first to comment!</p>
        ) : (
          comments.map((comment) => (
            <div key={comment.id} className="border border-gray-200 rounded-lg p-4">
              <div className="flex justify-between items-start mb-2">
                <div>
                  <span className="font-semibold">{comment.author}</span>
                  <span className="text-gray-500 text-sm ml-2">{comment.timestamp}</span>
                </div>
                <div className="flex space-x-2">
                  <button
                    onClick={() => handleStatusChange(comment.id, 'approved')}
                    className={`p-1 rounded ${
                      comment.status === 'approved' ? 'bg-green-100 text-green-600' : 'text-gray-400'
                    }`}
                    title="Approve comment"
                  >
                    <CheckCircle size={20} />
                  </button>
                  <button
                    onClick={() => handleStatusChange(comment.id, 'rejected')}
                    className={`p-1 rounded ${
                      comment.status === 'rejected' ? 'bg-red-100 text-red-600' : 'text-gray-400'
                    }`}
                    title="Reject comment"
                  >
                    <XCircle size={20} />
                  </button>
                  <button
                    onClick={() => handleDeleteComment(comment.id)}
                    className="p-1 rounded text-gray-400 hover:text-red-500"
                    title="Delete comment"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M3 6h18"></path>
                      <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path>
                      <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path>
                    </svg>
                  </button>
                </div>
              </div>
              <p className="text-gray-700 mb-2">{comment.text}</p>
              {comment.status !== 'pending' && (
                <div className="mt-2">
                  <textarea
                    value={comment.feedback}
                    onChange={(e) => handleAddFeedback(comment.id, e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    rows="2"
                    placeholder="Add feedback..."
                  />
                </div>
              )}
              <div className="mt-2 flex items-center space-x-2">
                {comment.status === 'approved' && (
                  <span className="inline-block bg-green-100 text-green-800 text-xs px-2 py-1 rounded">
                    Approved
                  </span>
                )}
                {comment.status === 'rejected' && (
                  <span className="inline-block bg-red-100 text-red-800 text-xs px-2 py-1 rounded">
                    Rejected
                  </span>
                )}
                {comment.status === 'pending' && (
                  <span className="inline-block bg-yellow-100 text-yellow-800 text-xs px-2 py-1 rounded">
                    Pending Review
                  </span>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default NotesSection;