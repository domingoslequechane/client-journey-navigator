-- Add 'fidelizacao' to journey_stage enum for the loyalty/retention stage
ALTER TYPE journey_stage ADD VALUE IF NOT EXISTS 'fidelizacao';