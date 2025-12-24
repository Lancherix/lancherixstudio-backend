import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import "./Styles/BoardTab.css";

export default function BoardTab() {
    const { projectId } = useParams(); // MUST exist in route
    const [images, setImages] = useState([]);
    const [loading, setLoading] = useState(true);

    /* ─────────────────────────────
       Load board images
    ───────────────────────────── */
    useEffect(() => {
        if (!projectId) return;

        fetch(`/api/projects/${projectId}/board-images`, {
            credentials: "include",
        })
            .then(res => {
                if (!res.ok) throw new Error("Failed to fetch images");
                return res.json();
            })
            .then(data => {
                setImages(data);
                setLoading(false);
            })
            .catch(err => {
                console.error(err);
                setLoading(false);
            });
    }, [projectId]);

    /* ─────────────────────────────
       Drag & drop upload
    ───────────────────────────── */
    const handleDrop = async (e) => {
        e.preventDefault();
        if (!projectId) return;

        const files = Array.from(e.dataTransfer.files).filter(file =>
            file.type.startsWith("image/")
        );

        if (files.length === 0) return;

        const formData = new FormData();
        files.forEach(file => formData.append("images", file)); // MUST be "images"

        const res = await fetch(
            `/api/projects/${projectId}/board-images`,
            {
                method: "POST",
                body: formData,
                credentials: "include",
            }
        );

        if (!res.ok) {
            const text = await res.text();
            console.error("Upload failed:", text);
            return;
        }

        const uploadedImages = await res.json(); // ARRAY
        setImages(prev => [...prev, ...uploadedImages]);
    };

    const handleDragOver = (e) => {
        e.preventDefault();
    };

    /* ─────────────────────────────
       Delete image
    ───────────────────────────── */
    const deleteImage = async (imageId) => {
        await fetch(`/api/board-images/${imageId}`, {
            method: "DELETE",
            credentials: "include",
        });

        setImages(prev => prev.filter(img => img._id !== imageId));
    };

    /* ─────────────────────────────
       Render
    ───────────────────────────── */
    return (
        <div
            className="board-total"
            onDrop={handleDrop}
            onDragOver={handleDragOver}
        >
            {loading && <p className="board-loading">Loading board…</p>}

            <div className="board-tab">
                {images.map(img => (
                    <div key={img._id} className="board-image-wrapper">
                        <img
                            src={img.url}
                            alt="board"
                            className="board-image"
                            draggable={false}
                        />

                        <button
                            className="delete-image-btn"
                            onClick={(e) => {
                                e.stopPropagation();
                                deleteImage(img._id);
                            }}
                            aria-label="Delete image"
                        >
                            ✕
                        </button>
                    </div>
                ))}
            </div>
        </div>
    );
}