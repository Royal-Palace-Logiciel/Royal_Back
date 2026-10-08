-- Migration: Add restaurant order customizations
-- Adds support for cooking level (cuisson) on order items and additional notes on orders
-- Date: 2026-08-31

-- Add notes column to orders table for additional information/special instructions
ALTER TABLE orders ADD COLUMN notes TEXT NULL AFTER cloture_at;

-- Add cuisson column to order_items table for cooking level customization
ALTER TABLE order_items ADD COLUMN cuisson VARCHAR(50) NULL AFTER prix_unitaire;
