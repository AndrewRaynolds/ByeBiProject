#!/bin/bash
set -e
npm install

# Production schema changes are deployed from supabase/migrations by the
# Supabase GitHub integration. Do not run drizzle-kit push after a merge.
