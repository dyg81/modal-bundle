<?php

namespace Rares\ModalBundle\Response;

use Symfony\Component\HttpFoundation\JsonResponse;

class DynamicRedirectResponse extends JsonResponse
{
    /**
     * If a form is successfully submitted, use the DynamicPageBundle
     * to dynamically modify the page.The url should return any of the
     * DynamicPageBundle responses.
     *
     * @param mixed $updateDOMResponse
     *   Any type of response from DynamicPageBundle.
     */
    public function __construct($updateDOMResponse)
    {
        if (!class_exists('Rares\DynamicPageBundle\Response\UpdateDOMResponse')) {
            trigger_error('The Dynamic Page Bundle is not installed.');
        }

        parent::__construct([
            'dynamic' => json_decode($updateDOMResponse->getContent())
        ]);
    }
}
