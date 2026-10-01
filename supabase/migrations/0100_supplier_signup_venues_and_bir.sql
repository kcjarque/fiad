-- Let a supplier say which Season 3 venue(s) they are applying for, and hold
-- the Sales Invoice / BIR 2303 copy SM Podium requires of its exhibitors.
--
-- Until now an application carried a season but no venue, so "a Podium
-- application" did not exist as a group -- there was no way to ask Podium
-- applicants alone for a document. venues records the event id of each venue
-- ticked on the form.
--
-- bir_document_urls is kept apart from document_urls (the DTI / SEC files)
-- rather than mixed into it, so the admin can see at a glance which file is
-- which and an application can be checked for the Podium requirement without
-- opening anything.
--
-- Both nullable and unbackfilled: the 203 Season 2 applications predate the
-- venue question and the Podium requirement, and inventing answers for them
-- would be worse than leaving them empty.

alter table supplier_signups add column if not exists venues text[];
alter table supplier_signups add column if not exists bir_document_urls text[];
