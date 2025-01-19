import React, { createContext, useState, useEffect } from "react";

type NotificationsContextType = {
  unreadCount: number;
};

export const NotificationsContext = createContext<NotificationsContextType>({
  unreadCount: 0,
});

export const NotificationsProvider = ({ children }: { children: React.ReactNode }) => {
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    // Fetch unread notifications count from your database or local state
    const fetchUnreadCount = async () => {
      // Simulated count fetch
      const count = 5; // Replace with actual fetch logic
      setUnreadCount(count);
    };

    fetchUnreadCount();
  }, []);

  return (
    <NotificationsContext.Provider value={{ unreadCount }}>
      {children}
    </NotificationsContext.Provider>
  );
};
