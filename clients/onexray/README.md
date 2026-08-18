# OneXray renderer

This workspace renders private OneXray node subscriptions and structured Xray
Profiles from the shared normalized node inventory. It never stores private
nodes or subscription URLs in the repository.

The renderer targets the official OneXray structured profile model: the
selected homepage node is injected by OneXray as the runtime `proxy` outbound;
the profile owns DNS, routing, direct/block outbounds, and optional fixed
business outbounds.
