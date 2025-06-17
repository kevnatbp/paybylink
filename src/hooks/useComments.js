import { useState } from 'react';

export const useComments = (prototypeId) => {
  const [comments, setComments] = useState([]);
  const [userName, setUserName] = useState('');

  const addComment = (text, tab) => {
    if (text.trim() && userName.trim()) {
      const comment = {
        id: Date.now(),
        text,
        author: userName,
        timestamp: new Date().toLocaleString(),
        tab,
        prototypeId
      };
      setComments(prev => [...prev, comment]);
    }
  };

  return {
    comments,
    userName,
    setUserName,
    addComment
  };
};