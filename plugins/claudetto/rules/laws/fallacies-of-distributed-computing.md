# Fallacies of Distributed Computing

Networks fail, stall, reorder and change. Give each remote call a timeout, a handled error path and a retry only where the call is idempotent.
