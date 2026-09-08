/**
 * Frozen names, paths and defaults. No behavior lives here.
 */

// RedTrack requires this exact cookie name. The docs state it must not be renamed.
export const CLICKID_COOKIE = 'rtkclickid-store';

// Checked in this order when resolving an inbound click ID.
export const CLICKID_PARAMS = Object.freeze(['rtkcid', 'clickid', 'rtkclickid']);

export const STORAGE_KEY = 'redtrack-test-lp:config';
export const CLICKID_STORAGE_KEY = 'redtrack-test-lp:clickid';
export const CLICKID_COOKIE_DAYS = 30;

// Params RedTrack itself owns, shown in their own bucket by the inspector.
export const TRACKING_PARAMS = Object.freeze([
  'clickid',
  'rtkcid',
  'rtkclickid',
  'cmpid',
  'campaign_id',
  'rt_campaignid',
  'type',
  'sum',
]);

export const CLICK_PATH = 'click';
export const PRECLICK_PATH = 'preclick';
export const POSTBACK_PATH = 'postback';

export const DEFAULT_CONFIG = Object.freeze({
  trackingDomain: '',
  campaignId: '',
  offerUrl: '',
  universalScript: '',
  defaultSum: '1.00',
});

export const CONVERSION_TYPES = Object.freeze([
  'Lead',
  'Sale',
  'Purchase',
  'Signup',
  'Deposit',
]);

// Query params that override stored settings for a single visit.
export const CONFIG_URL_OVERRIDES = Object.freeze({
  rt_domain: 'trackingDomain',
  rt_cmpid: 'campaignId',
  rt_offer: 'offerUrl',
});
