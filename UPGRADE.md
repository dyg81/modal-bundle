# Upgrade Guide

## From 2.x to 3.0 (in development)

This section will be completed during the development of 3.0 and will include a table of
equivalencies (CSS classes, responses, templates, and translations).

### Importing routes

Before (`config/routes.yaml`):

dyg81_modal:
resource: "@Dyg81ModalBundle/src/Controller/"
type: annotation

Now (`config/routes/dyg81_modal.yaml`):

dyg81_modal:
resource: '@Dyg81ModalBundle/config/routes.php'
prefix: /modal

With `prefix: /modal`, the URLs remain the same as in version 2.x.