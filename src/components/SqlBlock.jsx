import React from 'react';
import { useDrag } from 'react-dnd';

const SqlBlock = ({ type, label, isTemplate = false, id }) => {
    const [{ isDragging }, drag] = useDrag(() => ({
        type: 'SQL_BLOCK',
        item: { type, label, id: isTemplate ? null : id }, // If template, id is null (new item)
        collect: (monitor) => ({
            isDragging: !!monitor.isDragging(),
        }),
    }));

    // Style based on block type
    let bgClass = 'bg-blue-500';
    if (['SELECT', 'FROM', 'WHERE', 'INSERT INTO', 'UPDATE', 'DELETE'].includes(label)) {
        bgClass = 'bg-indigo-600';
    } else if (['=', '>', '<', 'AND', 'OR', 'LIKE', 'BETWEEN'].includes(label)) {
        bgClass = 'bg-purple-600';
    } else if (['employees', 'students', 'products', 'salary', 'name', 'id'].includes(label)) {
        bgClass = 'bg-green-600';
    } else {
        bgClass = 'bg-gray-600';
    }

    return (
        <div
            ref={drag}
            className={`px-4 py-2 rounded-full text-white font-mono text-sm shadow-md cursor-move flex items-center justify-center transition-transform hover:scale-105 ${bgClass} ${isDragging ? 'opacity-50' : 'opacity-100'}`}
        >
            {label}
        </div>
    );
};

export default SqlBlock;
