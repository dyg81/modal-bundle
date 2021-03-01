<?php

namespace Dyg81\ModalBundle\Response;

use Symfony\Component\HttpFoundation\JsonResponse;

class DynamicOpenResponse extends JsonResponse
{
    /**
     * Create a new response which dynamically updates the page after a form
     * is successfully submitted and also opens a modal.
     *
     * @param mixed $updateDOMResponse
     *   Any type of response from DynamicPageBundle.
     * @param string $modal
     *   The modal that will be opened.
     * @param string $modalId
     *   The id of the modal.
     *
     * @author Donald Yañez González <donald.yanez@gmail.com>
     */
    public function __construct($updateDOMResponse, $modal, $modalId = null)
    {
        if (!class_exists('Rares\DynamicPageBundle\Response\UpdateDOMResponse')) {
            trigger_error('The Dynamic Page Bundle is not installed.');
        }

        parent::__construct([
            'dynamic' => json_decode($updateDOMResponse->getContent()),
            'modal' => $modal,
            'modalId' => $modalId
        ]);
    }
}
