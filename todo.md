# Camp Availability Platform - TODO

## Phase 1: Backend Integration
- [x] Copy backend packages from camp-availability-platform to web-app
- [x] Update package.json with backend dependencies
- [x] Install all dependencies

## Phase 2: Database & API
- [x] Update Drizzle schema with campground tables
- [x] Create tRPC routers for search, saved searches, and alerts
- [x] Implement geo-spatial search with caching
- [x] Implement availability scoring engine integration
- [x] Create alert subscription endpoints

## Phase 3: Authentication UI
- [ ] Build register page with email/password form
- [ ] Build login page
- [ ] Implement email verification flow
- [ ] Implement password reset flow
- [ ] Add protected route wrapper

## Phase 4: Search Interface
- [x] Create search form with location, dates, radius, site types
- [x] Build search results list with distance and scores
- [ ] Integrate Google Maps with campground markers
- [ ] Add map toggle and result highlighting
- [x] Implement score threshold filter

## Phase 5: Saved Searches & Alerts
- [x] Create saved search form
- [x] Build saved searches list page
- [x] Implement alert subscription UI
- [x] Add alert type selection (availability, score, cancellation, price)
- [x] Add notification channel selection

## Phase 6: User Dashboard
- [x] Build dashboard layout with navigation
- [x] Create notification history page
- [x] Add alert subscription management
- [x] Show saved searches overview

## Phase 7: Testing & Polish
- [x] Test authentication flows
- [x] Test search with various parameters
- [x] Test saved searches CRUD
- [x] Test alert subscriptions
- [x] Verify notification history
- [x] Create checkpoint

## Phase 8: Delivery
- [ ] Final status check
- [ ] Create comprehensive documentation
- [ ] Deliver to user


## Week 4: Intelligence Layer

### Phase 1: Foundation
- [x] Create intelligence-engine package structure
- [x] Add CampsiteHistoricalStats table
- [x] Add CampsitePredictionSnapshot table
- [x] Add CampsitePriceHistory table
- [x] Create feature engineering service

### Phase 2: Cancellation Model
- [x] Build cancellation probability engine
- [x] Implement feature vector computation
- [x] Add confidence scoring
- [x] Store predictions in snapshot table

### Phase 3: Booking & Demand
- [x] Implement booking likelihood engine
- [x] Build geo demand heatmap engine
- [x] Create demand scoring algorithm
- [x] Add geo tile aggregation

### Phase 4: Price & Analytics
- [x] Create price change detection system
- [x] Build historical availability aggregator
- [x] Implement price trend tracking
- [x] Add price event triggers

### Phase 5: Prediction System
- [x] Create prediction snapshot worker
- [x] Implement backfill job
- [x] Add incremental update support
- [x] Create model evaluation logging

### Phase 6: Analytics API
- [x] Add GET /analytics/cancellation-risk/:campsiteId
- [x] Add GET /analytics/booking-urgency/:campsiteId
- [x] Add GET /analytics/demand-heatmap
- [x] Add GET /analytics/price-trend/:campsiteId
- [x] Implement rate limiting
- [x] Add authentication requirements

### Phase 7: Frontend Intelligence
- [x] Add high demand badge to campsite cards
- [x] Add likely to book soon badge
- [x] Add high cancellation chance badge
- [x] Add price drop badge
- [ ] Implement demand heatmap layer toggle

### Phase 8: Testing & Observability
- [x] Write deterministic prediction tests
- [x] Add edge case feature tests
- [x] Create historical replay simulation tests
- [x] Add geo aggregation correctness tests
- [x] Expose prediction metrics
- [x] Add model evaluation logging

### Phase 9: Final Testing
- [x] Test all intelligence endpoints
- [x] Verify frontend badges display correctly
- [x] Test backfill job
- [x] Verify observability metrics
- [ ] Create checkpoint
