import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';

export const useSupabaseComments = (prototypeId) => {
  const [comments, setComments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Fetch comments
  const fetchComments = async () => {
    try {
      setLoading(true);
      console.log('Fetching comments for prototype:', prototypeId); // Debug log
      
      const { data, error } = await supabase
        .from('comments')
        .select('id, text, author, tab, prototype_id, created_at')
        .eq('prototype_id', prototypeId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Supabase error:', error);
        throw error;
      }
      
      console.log('Fetched comments:', data); // Debug log
      setComments(data || []);
    } catch (err) {
      console.error('Error fetching comments:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Add a new comment
  const addComment = async (comment) => {
    try {
      // Validate required fields
      if (!comment.text || !comment.author || !comment.tab) {
        throw new Error('Missing required fields for comment');
      }

      const newComment = {
        prototype_id: prototypeId,
        text: comment.text.trim(),
        author: comment.author.trim(),
        tab: comment.tab
      };

      console.log('Adding comment:', newComment); // Debug log

      const { data, error } = await supabase
        .from('comments')
        .insert([newComment])
        .select('id, text, author, tab, prototype_id, created_at')
        .single();

      if (error) {
        console.error('Supabase error:', error);
        throw error;
      }

      if (!data) {
        throw new Error('No data returned from insert');
      }

      console.log('Added comment:', data); // Debug log
      setComments(prev => [data, ...prev]);
      return data;
    } catch (err) {
      console.error('Error adding comment:', err);
      setError(err.message);
      throw err;
    }
  };

  // Delete a comment
  const deleteComment = async (commentId) => {
    try {
      const { error } = await supabase
        .from('comments')
        .delete()
        .eq('id', commentId);

      if (error) {
        console.error('Supabase error:', error);
        throw error;
      }

      setComments(prev => prev.filter(comment => comment.id !== commentId));
    } catch (err) {
      console.error('Error deleting comment:', err);
      setError(err.message);
      throw err;
    }
  };

  // Initial fetch of comments
  useEffect(() => {
    console.log('useEffect triggered for prototype:', prototypeId); // Debug log
    fetchComments();
  }, [prototypeId]);

  return {
    comments,
    loading,
    error,
    addComment,
    deleteComment,
    refreshComments: fetchComments
  };
};
