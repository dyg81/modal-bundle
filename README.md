# Overview
This symfony bundle is a fork of [Rares/ModalBundle](https://packagist.org/packages/rares/modal-bundle) which is no longer maintained.

This new bundle is intend to work with Symfony 3.4/4.4/5.x to simplifies the process of displaying content in a modal. It provides several functionalities, from displaying simple messages and confirmation modals to displaying hole forms inside a modal.

# Version History

    v1.0.0 - First release. Support only Symfony 3.4.* Standard Edition without symfony flex.
    v1.0.1 - Fix a minor issue.
    v1.0.2 - Improve symfony/framework-bundle syntaxis in the composer.json file.
    v1.0.3 - Drop DynamicPageBundle support.
    v1.1.0 - Change the require section in composer.json to support only Symfony 3.4.* Standard Edition with flex.

# Installation
To install this bundle, first you need to have jQuery and Bootstrap installed.

Then you need to require this bundle:

```
  composer require "dyg81/modal-bundle"
```

After that, add the following code to the file routing.yml or annotations.yaml, depending of the symfony version you are working on, for the controller routes to work properly:

```yml
dyg81modalbundle:
    resource: "@Dyg81ModalBundle/Controller/"
    type:     annotation
```

**Hint:** The processes below are automatic if you use symfony flex.

Then, enable the bundle in your AppKernel file:

```php
$bundles = [
	...,
	new Dyg81\ModalBundle\RaresModalBundle(),
];
```

And install the assets using the command:

```
bin/console assets:install --symlink
```

Finally, you need to include one javascript file in your templates where you want to use modals, I recommend including it in the base template:

```twig
<script src="{{ asset('bundles/dyg81modal/js/scripts.js') }}"></script>
```

If you want to have a loading icon when ajax requests are made, you should also include the css file included in this module:

```twig
<link href="{{ asset('bundles/dyg81modal/css/ajax-progress.css') }}" rel="stylesheet">
```

# Features
The ModalBundle provides two basic modal types: a content modal, which can also include forms and a confirmation modal. You can also use this bundle to open modals after a successful form submission. We will take a look at all the different modal types and how to use them.

Keep in mind that this bundle only supports one modal open at a time, because this is the default Bootstrap behaviour.

Also, when doing ajax request, after the element that was clicked, a div element is added with the classes **ajax-progress** and **ajax-progress-throbber** and a dynamic class if the clicked element has an id, **ajax-progress-ELEMENTID**. Inside this div there is also another div with the class **throbber** that renders a small gif file. If you do not want to use the default loading gif, you should not include the css file in the project and customize the css however you want.

### Content Modal
The content modal is the basic modal type which can be used to display pretty much any content inside a modal.

This bundle contains a simple controller action that displays a translatable info message given as a parameter, which can be used if simple messages need to be displayed to the user.
The controller action looks like this:

```php
    /**
         * Helper function to display a simple translatable message in a modal.
         * The link to this route should have the attributes:
         *  class: modal-open
         *
         * @Route("/modal/open/{message}", name="dyg81_modal_open_message")
         */
        public function openMessageModalAction($message)
        {
            return $this->render('@Dyg81Modal/messageModal.html.twig', [
                'message' => $this->get('translator')->trans($message),
            ]);
        }
```

The messageModal.html.twig template is just a simple template that extends the base modal template baseModal.html.twig and just displays a message in the modal body. The baseModal.html.twig is a base file for a modal with multiple blocks that can be overwritten. Take a look at it [here](Resources/views/baseModal.html.twig).

To open a simple message modal from a twig file we have to put the class **modal-open** on a clickable element which should have an href attribute with the path to the controller action, for example like this:

```twig
<button href="{{ path('dyg81_modal_open_message', {'message': 'info.message'}) }}" class="modal-open" type="button" class="btn btn-secondary">Open Test Modal</button>
```

If we want to display our own custom content in a modal, we can also do that pretty easily. We need to create a controller action which should return a template which extends the baseModal.html.twig template, or we can also create our own custom modal template. An example of a controller action is found below:

```php
    /**
     * Finds and displays a ContactMessage entity.
     *
     * @Route("/modal/{id}", name="contact_show_modal")
     * @Method("GET")
     */
    public function showModalAction(ContactMessage $contactMessage)
    {
        $deleteForm = $this->createDeleteForm($contactMessage);

        return $this->render('AppBundle:contact:showModal.html.twig', array(
            'contactMessage' => $contactMessage,
            'delete_form' => $deleteForm->createView(),
        ));
    }
```

In a twig file we can then make an element with the same class, **modal-open** set on it and with the href attribute pointing to our controller action.

```twig
<a class="modal-open" data-modal-id="contact-modal" href="{{ path('contact_show_modal', { 'id': contactMessage.id }) }}">Show Modal</a>
```

As you can see, in the example above we also specify the attribute **data-modal-id**. This attribute will be used to open the modal with the specific id. This is useful if we have custom modal templates, or if we set a custom id in our template like we did here. The default id for the baseModal.html.twig template is **base-modal** and is recommended that all modals use that id.


### Opening forms inside modals
Opening a form inside a modal is pretty similar to opening a normal modal, you just have to make some adjustments to your controller action.

Example of a link that opens a form:

```twig
<a class="modal-open" href="{{ path('contact_edit_modal', { 'id': contactMessage.id }) }}">edit modal</a>
```

In the controller action, the form action url will need to be explicitly set on the form, preferably to the same controller action. Also, when the form is successfully submitted, the redirection to a new page should be done by returning a new [ModalRedirectResponse](Response/ModalRedirectResponse.php) object, which takes an url as a parameter.

When submitting the form, it is submitted by an ajax call and then if no redirection occurs, the modal is closed and opened with the new form which should contain any form errors. For this reason, there can be no modal animations on the form modal. You can find a base template for a modal form with no animations [here](Resources/views/baseFormModal.html.twig).

Keep in mind that if you have multiple forms inside the modal, only the first one will be submitted using ajax. Below is an example of a controller action that returns a modal form template which extends the template mentioned above:

```php
    /**
     * Displays a form in a modal to edit an existing ContactMessage entity.
     *
     * Every form displayed inside a modal should have the action url explicitly
     * set.Also, if the form is valid, redirecting should be done by return a
     * ModalRedirectResponse object.
     *
     * @Route("/modal/{id}/edit", name="contact_edit_modal")
     * @Method({"GET", "POST"})
     */
    public function editModalAction(Request $request, ContactMessage $contactMessage)
    {
        $deleteForm = $this->createDeleteForm($contactMessage);
        $editForm = $this->createForm(ContactMessageType::class, $contactMessage, [
            // Make sure to explicitly set the action.
            'action' => $this->generateUrl('contact_edit_modal', ['id' => $contactMessage->getId()])
        ]);
        $editForm->add('save', SubmitType::class, ['label' => 'Edit']);

        $editForm->handleRequest($request);

        if ($editForm->isValid()) {
            $em = $this->getDoctrine()->getManager();
            $em->persist($contactMessage);
            $em->flush();

            $this->addFlash('notice', 'Entity edited.');

	    // On success, redirection should be done by returning a new ModalRedirectResponse object.
            return new ModalRedirectResponse($this->generateUrl('contact_index'));
        }

        return $this->render('AppBundle:contact:editModal.html.twig', array(
            'contactMessage' => $contactMessage,
            'edit_form' => $editForm->createView(),
            'delete_form' => $deleteForm->createView(),
        ));
    }
```

### Confirmation Modal
This is a special modal type which is used for confirming user input. The ModalBundle provides a default controller action for opening a basic confirmation modal:

```php
    /**
         * Helper function to open a simple confirm modal.
         * The link to this route should have the attributes:
         *  class: modal-open-confirm
         *  data-modal-href: {{ path('dyg81_modal_open_confirm') }}
         *
         * @Route("/modal/confirm", name="dyg81_modal_open_confirm")
         */
        public function openConfirmModalAction()
        {
            return $this->render('@Dyg81Modal/baseConfirmModal.html.twig');
        }
```

The template file for this modal can be found [here](Resources/views/baseConfirmModal.html.twig). It displays a title and a body message, which are translatable and can be overwritten, and also has two buttons, one for closing the modal and another confirm button. The confirm button needs to have the class **modal-btn-confirm** in order for the modal to work properly. Keep this in mind if you want to make your own custom layout for this type of modal.

This modal is opened in a different way that the content modal. The class that needs to be added to the element is **modal-open-confirm** and the element needs to also have the attribute **data-modal-href** set to the controller action which returns the confirmation modal template. The **data-modal-id** attribute is also supported.

The class can be put also on form elements, like buttons and inputs and after confirmation the form will be submitted, or on anchor elements, where the browser will be redirected to the href link after confirmation. This is an example on how to use this modal type on a link:

```twig
<a href="{{ path('contact_index') }}" class="modal-open-confirm" data-modal-href="{{ path('dyg81_modal_open_confirm') }}">Open Confirm Modal</a>
```

Or it can be used on a button inside a form:

```php
return $this->createFormBuilder()
            ->add('delete', SubmitType::class, [
                'attr' => [
                    'class' => 'modal-open-confirm',
                    'data-modal-href' => $this->generateUrl('dyg81_modal_open_confirm'),
                ],
            ])
            ->setAction($this->generateUrl('contact_delete', array('id' => $contactMessage->getId())))
            ->setMethod('DELETE')
            ->getForm()
        ;
```

### Open modal after successful form submission
With this bundle it is also possible to open a modal after a form has been successfully submitted without reloading the page. This is useful if you want to have a multi step form form example.

What you have to do is put the class **modal-open-from-form** on your form. The form will then be submitted using ajax and if errors were found the page is reload, if not a modal will open. To open a modal, when the form is successfully submitted, you should return a response of type [ModalOpenResponse](Response/ModalOpenResponse.php).This takes two arguments, the first is the url from which the modal will be loaded, this should return a simple modal or a form modal. The second argument is optional and is the modal id if you want to have a modal with a custom id.

Example response:

```php
if ($form->isValid()) {
    // Process your data...

    return new ModalOpenResponse(
        $this->generateUrl('contact_edit_modal', ['id' => $contactMessage->getId()]),
        'your_custom_modal_id_or_null'
    );
}
```
