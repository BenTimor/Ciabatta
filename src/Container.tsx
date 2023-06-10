import React from 'react';

export const Container: React.FC<{ children: React.ReactNode | React.ReactNode[] }> = ({ children }) => {
    return (
        <div style={{ minWidth: 300, display: "flex", justifyContent: "center" }}>
            {children}
        </div>
    );
}
